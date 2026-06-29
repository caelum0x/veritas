// Negotiation application service: quote, accept, reject, and expire CAP price negotiations.
import {
  ok,
  err,
  isErr,
  newId,
  epochToIso,
  contentHash,
  type Result,
  type Logger,
  type Page,
  toPageRequest,
} from "@veritas/core";
import type { Negotiation, NegotiationStatus } from "@veritas/contracts";
import type { NegotiationRepository } from "@veritas/persistence";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  PreconditionFailedError,
  ServiceValidationError,
} from "../errors.js";
import {
  type CreateNegotiationInput,
  type ListNegotiationsInput,
  type NegotiationOutput,
  toNegotiationOutput,
} from "./negotiation.dto.js";

/** Application service for CAP price negotiation lifecycle management. */
export class NegotiationService {
  constructor(
    private readonly repo: NegotiationRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Open a new negotiation quote for a buyer agent against a service.
   * Returns QUOTED status with a deterministic quoteHash over the price+expiry.
   */
  async quote(
    ctx: ServiceContext,
    input: CreateNegotiationInput,
  ): Promise<Result<NegotiationOutput, ServiceValidationError>> {
    const log = this.logger.child({ traceId: ctx.traceId, op: "negotiation.quote" });

    const expiresAt = new Date(input.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return err(
        new ServiceValidationError("expiresAt must be a valid future ISO timestamp.", {
          expiresAt: "Must be a future date.",
        }),
      );
    }

    const quoteHash = contentHash({
      serviceId: input.serviceId,
      buyerAgentId: input.buyerAgentId,
      price: input.price,
      expiresAt: input.expiresAt,
    });

    const result = await this.repo.create({
      ...input,
      quoteHash,
    } as Parameters<typeof this.repo.create>[0]);

    if (isErr(result)) {
      log.error("Failed to persist negotiation", { error: String(result.error) });
      return err(new ServiceValidationError("Failed to create negotiation."));
    }

    log.info("Negotiation quoted", { negotiationId: result.value.id });
    return ok(toNegotiationOutput(result.value));
  }

  /** Retrieve a single negotiation by id. */
  async getById(
    ctx: ServiceContext,
    negotiationId: string,
  ): Promise<Result<NegotiationOutput, ResourceNotFoundError>> {
    const result = await this.repo.findById(negotiationId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Negotiation", negotiationId));
    }
    return ok(toNegotiationOutput(result.value));
  }

  /** List negotiations with optional filters. */
  async list(
    ctx: ServiceContext,
    input: ListNegotiationsInput,
  ): Promise<Result<Page<NegotiationOutput>>> {
    const { buyerAgentId, serviceId, status, limit, cursor } = input;
    const pagination = toPageRequest({ limit, cursor });

    let result: Result<Page<Negotiation>>;

    if (buyerAgentId !== undefined) {
      result = await this.repo.findByBuyerAgentId(buyerAgentId, { page: pagination });
    } else if (serviceId !== undefined) {
      result = await this.repo.findByServiceId(serviceId, { page: pagination });
    } else if (status !== undefined) {
      result = await this.repo.findByStatus(status as NegotiationStatus, { page: pagination });
    } else {
      result = await this.repo.list({ page: pagination });
    }

    if (isErr(result)) {
      return result;
    }

    const page = result.value;
    return ok({ ...page, items: page.items.map(toNegotiationOutput) });
  }

  /**
   * Accept a QUOTED negotiation, moving it to ACCEPTED status.
   * The buyer agent signals agreement; an order can then be placed.
   */
  async accept(
    ctx: ServiceContext,
    negotiationId: string,
  ): Promise<Result<NegotiationOutput, ResourceNotFoundError | PreconditionFailedError>> {
    return this._transition(ctx, negotiationId, "ACCEPTED", ["QUOTED"]);
  }

  /**
   * Reject a QUOTED or ACCEPTED negotiation.
   */
  async reject(
    ctx: ServiceContext,
    negotiationId: string,
  ): Promise<Result<NegotiationOutput, ResourceNotFoundError | PreconditionFailedError>> {
    return this._transition(ctx, negotiationId, "REJECTED", ["QUOTED", "ACCEPTED"]);
  }

  /**
   * Expire all QUOTED negotiations whose expiresAt is in the past.
   * Returns the count of expired records.
   */
  async expireStale(
    ctx: ServiceContext,
  ): Promise<Result<number>> {
    const beforeIso = epochToIso(Date.now());
    const result = await this.repo.expireQuoted(beforeIso);
    if (isErr(result)) {
      this.logger.child({ traceId: ctx.traceId }).error("Failed to expire negotiations");
      return result;
    }
    this.logger
      .child({ traceId: ctx.traceId })
      .info("Stale negotiations expired", { count: result.value });
    return ok(result.value);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _transition(
    ctx: ServiceContext,
    negotiationId: string,
    target: NegotiationStatus,
    allowed: NegotiationStatus[],
  ): Promise<Result<NegotiationOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const found = await this.repo.findById(negotiationId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Negotiation", negotiationId));
    }

    const neg = found.value;
    if (!(allowed as string[]).includes(neg.status)) {
      return err(
        new PreconditionFailedError(
          `Negotiation ${negotiationId} cannot move to ${target} from ${neg.status}.`,
        ),
      );
    }

    const updated = await this.repo.update(negotiationId, { status: target });
    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Negotiation", negotiationId));
    }

    this.logger
      .child({ traceId: ctx.traceId })
      .info(`Negotiation ${target.toLowerCase()}`, { negotiationId });
    return ok(toNegotiationOutput(updated.value));
  }
}
