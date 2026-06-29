// Agent-registration service: lifecycle management for CAP agent onboarding and status transitions.
import {
  ok,
  err,
  isErr,
  type Result,
  type AppError,
  type Logger,
  noopLogger,
  type Clock,
  systemClock,
  toPageRequest,
} from "@veritas/core";
import type { AgentRepository } from "@veritas/persistence";
import type { Agent } from "@veritas/contracts";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  DuplicateResourceError,
  PreconditionFailedError,
} from "../errors.js";
import type {
  InitiateRegistrationInput,
  ApproveRegistrationInput,
  SuspendRegistrationInput,
  RevokeRegistrationInput,
  ReactivateRegistrationInput,
  ListRegistrationsInput,
  AgentRegistrationOutput,
  AgentRegistrationListOutput,
  RegistrationStatus,
} from "./agent-registration.dto.js";

/** Per-agent registration metadata stored alongside the agent record. */
interface RegistrationMeta {
  readonly agentId: string;
  readonly orgId: string;
  status: RegistrationStatus;
  reason: string | null;
  approverNotes: string | null;
  readonly registeredAt: string;
  statusChangedAt: string;
}

/** Pluggable store for registration metadata (separate from AgentRepository). */
export interface RegistrationMetaStore {
  get(agentId: string): Promise<RegistrationMeta | undefined>;
  set(meta: RegistrationMeta): Promise<void>;
  list(filters: { orgId?: string; status?: RegistrationStatus }, cursor?: string, limit?: number): Promise<{
    items: RegistrationMeta[];
    nextCursor: string | null;
    total: number;
  }>;
}

/** Dependencies injected into AgentRegistrationService. */
export interface AgentRegistrationServiceDeps {
  readonly agentRepository: AgentRepository;
  readonly registrationStore: RegistrationMetaStore;
  readonly clock?: Clock;
  readonly logger?: Logger;
}

/** Build the combined output DTO from agent + registration metadata. */
function toOutput(agent: Agent, meta: RegistrationMeta): AgentRegistrationOutput {
  return {
    agent: {
      id: agent.id,
      name: agent.name,
      walletAddress: agent.walletAddress,
      endpoint: agent.endpoint ?? null,
      publicKey: agent.publicKey ?? null,
      trusted: agent.trusted,
      metadata: agent.metadata,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    },
    status: meta.status,
    orgId: meta.orgId,
    reason: meta.reason,
    approverNotes: meta.approverNotes,
    registeredAt: meta.registeredAt,
    statusChangedAt: meta.statusChangedAt,
  };
}

/** Application service for managing the full lifecycle of CAP agent registrations. */
export class AgentRegistrationService {
  private readonly agents: AgentRepository;
  private readonly store: RegistrationMetaStore;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: AgentRegistrationServiceDeps) {
    this.agents = deps.agentRepository;
    this.store = deps.registrationStore;
    this.clock = deps.clock ?? systemClock;
    this.logger = deps.logger ?? noopLogger;
  }

  /**
   * Initiate a new agent registration. The agent record is created and placed
   * in PENDING status awaiting approval.
   */
  async initiate(
    ctx: ServiceContext,
    input: InitiateRegistrationInput,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const existing = await this.agents.findByWalletAddress(input.agent.walletAddress);
    if (!isErr(existing)) {
      return err(
        new DuplicateResourceError(
          "Agent",
          "walletAddress",
          input.agent.walletAddress,
        ) as AppError,
      );
    }

    const createResult = await this.agents.create({
      name: input.agent.name,
      walletAddress: input.agent.walletAddress,
      endpoint: input.agent.endpoint ?? null,
      publicKey: input.agent.publicKey ?? null,
      metadata: input.agent.metadata,
    });

    if (isErr(createResult)) {
      return err(createResult.error as AppError);
    }

    const agent = createResult.value;
    const now = new Date(this.clock.now()).toISOString();
    const meta: RegistrationMeta = {
      agentId: agent.id,
      orgId: input.orgId,
      status: "PENDING",
      reason: input.reason ?? null,
      approverNotes: null,
      registeredAt: now,
      statusChangedAt: now,
    };

    await this.store.set(meta);

    this.logger.info("agent-registration: initiated", {
      agentId: agent.id,
      orgId: input.orgId,
      traceId: ctx.traceId,
    });

    return ok(toOutput(agent, meta));
  }

  /**
   * Approve a PENDING registration, moving it to ACTIVE and marking the agent as trusted.
   */
  async approve(
    ctx: ServiceContext,
    input: ApproveRegistrationInput,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const [agentResult, meta] = await Promise.all([
      this.agents.findById(input.agentId),
      this.store.get(input.agentId),
    ]);

    if (isErr(agentResult)) {
      return err(new ResourceNotFoundError("Agent", input.agentId) as AppError);
    }
    if (!meta) {
      return err(new ResourceNotFoundError("AgentRegistration", input.agentId) as AppError);
    }
    if (meta.status !== "PENDING") {
      return err(
        new PreconditionFailedError(
          `Agent registration is in status '${meta.status}', expected PENDING.`,
        ) as AppError,
      );
    }

    const now = new Date(this.clock.now()).toISOString();
    const updatedMeta: RegistrationMeta = {
      ...meta,
      status: "ACTIVE",
      approverNotes: input.approverNotes ?? null,
      statusChangedAt: now,
    };
    await this.store.set(updatedMeta);

    const updateResult = await this.agents.update(input.agentId, { trusted: true });
    if (isErr(updateResult)) {
      return err(updateResult.error as AppError);
    }

    this.logger.info("agent-registration: approved", {
      agentId: input.agentId,
      traceId: ctx.traceId,
    });

    return ok(toOutput(updateResult.value, updatedMeta));
  }

  /**
   * Suspend an ACTIVE registration temporarily. The agent record is marked as not trusted.
   */
  async suspend(
    ctx: ServiceContext,
    input: SuspendRegistrationInput,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const [agentResult, meta] = await Promise.all([
      this.agents.findById(input.agentId),
      this.store.get(input.agentId),
    ]);

    if (isErr(agentResult)) {
      return err(new ResourceNotFoundError("Agent", input.agentId) as AppError);
    }
    if (!meta) {
      return err(new ResourceNotFoundError("AgentRegistration", input.agentId) as AppError);
    }
    if (meta.status !== "ACTIVE") {
      return err(
        new PreconditionFailedError(
          `Agent registration is in status '${meta.status}', expected ACTIVE.`,
        ) as AppError,
      );
    }

    const now = new Date(this.clock.now()).toISOString();
    const updatedMeta: RegistrationMeta = {
      ...meta,
      status: "SUSPENDED",
      reason: input.reason,
      statusChangedAt: now,
    };
    await this.store.set(updatedMeta);

    const updateResult = await this.agents.update(input.agentId, { trusted: false });
    if (isErr(updateResult)) return err(updateResult.error as AppError);

    this.logger.warn("agent-registration: suspended", {
      agentId: input.agentId,
      reason: input.reason,
      traceId: ctx.traceId,
    });

    return ok(toOutput(updateResult.value, updatedMeta));
  }

  /**
   * Revoke a registration permanently. Revoked agents cannot be reactivated.
   */
  async revoke(
    ctx: ServiceContext,
    input: RevokeRegistrationInput,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const [agentResult, meta] = await Promise.all([
      this.agents.findById(input.agentId),
      this.store.get(input.agentId),
    ]);

    if (isErr(agentResult)) {
      return err(new ResourceNotFoundError("Agent", input.agentId) as AppError);
    }
    if (!meta) {
      return err(new ResourceNotFoundError("AgentRegistration", input.agentId) as AppError);
    }
    if (meta.status === "REVOKED") {
      return err(
        new PreconditionFailedError("Agent registration is already revoked.") as AppError,
      );
    }

    const now = new Date(this.clock.now()).toISOString();
    const updatedMeta: RegistrationMeta = {
      ...meta,
      status: "REVOKED",
      reason: input.reason,
      statusChangedAt: now,
    };
    await this.store.set(updatedMeta);

    const updateResult = await this.agents.update(input.agentId, { trusted: false });
    if (isErr(updateResult)) return err(updateResult.error as AppError);

    this.logger.warn("agent-registration: revoked", {
      agentId: input.agentId,
      reason: input.reason,
      traceId: ctx.traceId,
    });

    return ok(toOutput(updateResult.value, updatedMeta));
  }

  /**
   * Reactivate a SUSPENDED registration, restoring ACTIVE status and agent trust.
   */
  async reactivate(
    ctx: ServiceContext,
    input: ReactivateRegistrationInput,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const [agentResult, meta] = await Promise.all([
      this.agents.findById(input.agentId),
      this.store.get(input.agentId),
    ]);

    if (isErr(agentResult)) {
      return err(new ResourceNotFoundError("Agent", input.agentId) as AppError);
    }
    if (!meta) {
      return err(new ResourceNotFoundError("AgentRegistration", input.agentId) as AppError);
    }
    if (meta.status !== "SUSPENDED") {
      return err(
        new PreconditionFailedError(
          `Agent registration is in status '${meta.status}', expected SUSPENDED.`,
        ) as AppError,
      );
    }

    const now = new Date(this.clock.now()).toISOString();
    const updatedMeta: RegistrationMeta = {
      ...meta,
      status: "ACTIVE",
      reason: input.reason ?? null,
      statusChangedAt: now,
    };
    await this.store.set(updatedMeta);

    const updateResult = await this.agents.update(input.agentId, { trusted: true });
    if (isErr(updateResult)) return err(updateResult.error as AppError);

    this.logger.info("agent-registration: reactivated", {
      agentId: input.agentId,
      traceId: ctx.traceId,
    });

    return ok(toOutput(updateResult.value, updatedMeta));
  }

  /** Retrieve the registration record for a single agent by its ID. */
  async getById(
    ctx: ServiceContext,
    agentId: string,
  ): Promise<Result<AgentRegistrationOutput, AppError>> {
    const [agentResult, meta] = await Promise.all([
      this.agents.findById(agentId),
      this.store.get(agentId),
    ]);

    if (isErr(agentResult)) {
      return err(new ResourceNotFoundError("Agent", agentId) as AppError);
    }
    if (!meta) {
      return err(new ResourceNotFoundError("AgentRegistration", agentId) as AppError);
    }

    this.logger.debug("agent-registration: fetched", { agentId, traceId: ctx.traceId });
    return ok(toOutput(agentResult.value, meta));
  }

  /** List agent registrations with optional org and status filters. */
  async list(
    ctx: ServiceContext,
    input: ListRegistrationsInput,
  ): Promise<Result<AgentRegistrationListOutput, AppError>> {
    const pageReq = toPageRequest({ cursor: input.cursor, limit: input.limit ?? 20 });
    const page = await this.store.list(
      { orgId: input.orgId, status: input.status },
      pageReq.cursor,
      pageReq.limit,
    );

    const agentIds = page.items.map((m) => m.agentId);
    const agentResults = await Promise.all(agentIds.map((id) => this.agents.findById(id)));

    const items: AgentRegistrationOutput[] = [];
    for (let i = 0; i < page.items.length; i++) {
      const meta = page.items[i]!;
      const agentResult = agentResults[i]!;
      if (!isErr(agentResult)) {
        items.push(toOutput(agentResult.value, meta));
      }
    }

    this.logger.debug("agent-registration: listed", {
      count: items.length,
      traceId: ctx.traceId,
    });

    return ok({ items, nextCursor: page.nextCursor, total: page.total });
  }
}
