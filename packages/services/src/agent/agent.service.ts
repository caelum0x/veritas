// Agent application service: register, update, query, and manage CAP agent records.
import {
  ok,
  err,
  isErr,
  type Result,
  type AppError,
  type Logger,
  type Page,
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
  RegisterAgentInput,
  UpdateAgentInput,
  ListAgentsInput,
  SetAgentTrustInput,
  AgentOutput,
  AgentListOutput,
} from "./agent.dto.js";
import {
  ListAgentsInputSchema,
} from "./agent.dto.js";

/** Dependencies injected into AgentService. */
export interface AgentServiceDeps {
  readonly agentRepository: AgentRepository;
  readonly logger: Logger;
}

/** Maps a persisted Agent entity to an AgentOutput projection. */
function toAgentOutput(agent: Agent): AgentOutput {
  return {
    id: agent.id,
    name: agent.name,
    walletAddress: agent.walletAddress,
    endpoint: agent.endpoint ?? null,
    publicKey: agent.publicKey ?? null,
    trusted: agent.trusted,
    metadata: agent.metadata,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

/** Application service for managing registered CAP agents. */
export class AgentService {
  private readonly agents: AgentRepository;
  private readonly logger: Logger;

  constructor(deps: AgentServiceDeps) {
    this.agents = deps.agentRepository;
    this.logger = deps.logger;
  }

  /** Register a new CAP agent. Fails if wallet address is already registered. */
  async register(
    ctx: ServiceContext,
    input: RegisterAgentInput,
  ): Promise<Result<AgentOutput, AppError>> {
    // Guard against duplicate wallet address.
    const existing = await this.agents.findByWalletAddress(input.walletAddress);
    if (!isErr(existing)) {
      return err(
        new DuplicateResourceError("Agent", "walletAddress", input.walletAddress) as AppError,
      );
    }

    const createResult = await this.agents.create({
      name: input.name,
      walletAddress: input.walletAddress,
      endpoint: input.endpoint ?? null,
      publicKey: input.publicKey ?? null,
      metadata: input.metadata,
    });

    if (isErr(createResult)) {
      return err(createResult.error as AppError);
    }

    this.logger.info("agent: registered", {
      agentId: createResult.value.id,
      walletAddress: input.walletAddress,
      traceId: ctx.traceId,
    });

    return ok(toAgentOutput(createResult.value));
  }

  /** Fetch a single agent by its ID. */
  async getById(
    ctx: ServiceContext,
    agentId: string,
  ): Promise<Result<AgentOutput, AppError>> {
    const result = await this.agents.findById(agentId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Agent", agentId) as AppError);
    }
    this.logger.debug("agent: fetched by id", { agentId, traceId: ctx.traceId });
    return ok(toAgentOutput(result.value));
  }

  /** Fetch a single agent by its wallet address. */
  async getByWalletAddress(
    ctx: ServiceContext,
    walletAddress: string,
  ): Promise<Result<AgentOutput, AppError>> {
    const result = await this.agents.findByWalletAddress(walletAddress);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Agent", walletAddress) as AppError);
    }
    this.logger.debug("agent: fetched by wallet", { walletAddress, traceId: ctx.traceId });
    return ok(toAgentOutput(result.value));
  }

  /** List agents with optional filters and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListAgentsInput,
  ): Promise<Result<AgentListOutput, AppError>> {
    const parsed = ListAgentsInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new PreconditionFailedError(
          parsed.error.issues.map((i) => i.message).join("; "),
        ) as AppError,
      );
    }

    const { trusted, walletAddress, limit, cursor } = parsed.data;
    const pageRequest = toPageRequest({ cursor, limit: limit ?? 20 });

    const page = await this.agents.list(
      { trusted, walletAddress },
      pageRequest,
    );

    this.logger.debug("agent: listed", {
      count: page.items.length,
      traceId: ctx.traceId,
    });

    return ok({
      items: page.items.map(toAgentOutput),
      nextCursor: page.nextCursor ?? null,
      total: page.items.length,
    });
  }

  /** Apply a partial update to an existing agent record. */
  async update(
    ctx: ServiceContext,
    agentId: string,
    input: UpdateAgentInput,
  ): Promise<Result<AgentOutput, AppError>> {
    const findResult = await this.agents.findById(agentId);
    if (isErr(findResult)) {
      return err(new ResourceNotFoundError("Agent", agentId) as AppError);
    }

    const updateResult = await this.agents.update(agentId, input);
    if (isErr(updateResult)) {
      return err(updateResult.error as AppError);
    }

    this.logger.info("agent: updated", { agentId, traceId: ctx.traceId });
    return ok(toAgentOutput(updateResult.value));
  }

  /** Set the trusted flag on an agent, controlling whether it may settle orders. */
  async setTrust(
    ctx: ServiceContext,
    input: SetAgentTrustInput,
  ): Promise<Result<AgentOutput, AppError>> {
    const findResult = await this.agents.findById(input.agentId);
    if (isErr(findResult)) {
      return err(new ResourceNotFoundError("Agent", input.agentId) as AppError);
    }

    const updateResult = await this.agents.update(input.agentId, {
      trusted: input.trusted,
    });
    if (isErr(updateResult)) {
      return err(updateResult.error as AppError);
    }

    this.logger.info("agent: trust updated", {
      agentId: input.agentId,
      trusted: input.trusted,
      traceId: ctx.traceId,
    });
    return ok(toAgentOutput(updateResult.value));
  }

  /** Remove an agent registration by ID. */
  async delete(
    ctx: ServiceContext,
    agentId: string,
  ): Promise<Result<void, AppError>> {
    const findResult = await this.agents.findById(agentId);
    if (isErr(findResult)) {
      return err(new ResourceNotFoundError("Agent", agentId) as AppError);
    }

    const deleteResult = await this.agents.delete(agentId);
    if (isErr(deleteResult)) {
      return err(deleteResult.error as AppError);
    }

    this.logger.info("agent: deleted", { agentId, traceId: ctx.traceId });
    return ok(undefined);
  }
}
