// DisputeService: orchestrates dispute lifecycle transitions and persistence.

import { ok, err, epochToIso, type Result, type Page } from "@veritas/core";
import type { Dispute, CreateDisputeInput } from "./dispute.js";
import { DisputeStatus } from "./dispute.js";
import type { DisputeRepository } from "./store.js";
import type { DisputeNotifier, DisputeListParams, AssignArbitratorInput, ResolveDisputeInput, EscalateDisputeInput, WithdrawDisputeInput } from "./types.js";
import { ALLOWED_TRANSITIONS } from "./types.js";
import {
  DisputeNotFoundError,
  InvalidDisputeTransitionError,
  DisputeAccessDeniedError,
} from "./errors.js";

/** Core application service for dispute management. */
export class DisputeService {
  constructor(
    private readonly repo: DisputeRepository,
    private readonly notifier: DisputeNotifier,
  ) {}

  /** Open a new dispute. */
  async openDispute(input: CreateDisputeInput): Promise<Result<Dispute>> {
    const result = await this.repo.create(input);
    if (!result.ok) return result;
    await this.notifier.onDisputeOpened(result.value);
    return result;
  }

  /** Retrieve a dispute by its opaque ID. */
  async getDispute(id: string): Promise<Result<Dispute>> {
    return this.repo.findById(id);
  }

  /** List disputes with optional filters and pagination. */
  async listDisputes(params: DisputeListParams): Promise<Result<Page<Dispute>>> {
    return this.repo.listWithParams(params);
  }

  /** Assign an arbitrator and move the dispute to UNDER_REVIEW. */
  async assignArbitrator(input: AssignArbitratorInput): Promise<Result<Dispute>> {
    const found = await this.repo.findById(input.disputeId);
    if (!found.ok) return found;

    const dispute = found.value;
    const allowed = ALLOWED_TRANSITIONS[dispute.status];
    if (!allowed.includes(DisputeStatus.UNDER_REVIEW)) {
      return err(new InvalidDisputeTransitionError(dispute.status, DisputeStatus.UNDER_REVIEW));
    }

    const updated = await this.repo.update(input.disputeId, {
      status: DisputeStatus.UNDER_REVIEW,
      arbitratorId: input.arbitratorId,
    });
    if (!updated.ok) return updated;
    await this.notifier.onDisputeUnderReview(updated.value);
    return updated;
  }

  /** Resolve a dispute with a textual resolution outcome. */
  async resolveDispute(input: ResolveDisputeInput): Promise<Result<Dispute>> {
    const found = await this.repo.findById(input.disputeId);
    if (!found.ok) return found;

    const dispute = found.value;
    const allowed = ALLOWED_TRANSITIONS[dispute.status];
    if (!allowed.includes(DisputeStatus.RESOLVED)) {
      return err(new InvalidDisputeTransitionError(dispute.status, DisputeStatus.RESOLVED));
    }

    const now = epochToIso(Date.now());
    const updated = await this.repo.update(input.disputeId, {
      status: DisputeStatus.RESOLVED,
      resolution: input.resolution,
      resolvedAt: now,
    });
    if (!updated.ok) return updated;
    await this.notifier.onDisputeResolved(updated.value);
    return updated;
  }

  /** Escalate a dispute beyond the current arbitration tier. */
  async escalateDispute(input: EscalateDisputeInput): Promise<Result<Dispute>> {
    const found = await this.repo.findById(input.disputeId);
    if (!found.ok) return found;

    const dispute = found.value;
    const allowed = ALLOWED_TRANSITIONS[dispute.status];
    if (!allowed.includes(DisputeStatus.ESCALATED)) {
      return err(new InvalidDisputeTransitionError(dispute.status, DisputeStatus.ESCALATED));
    }

    const updated = await this.repo.update(input.disputeId, {
      status: DisputeStatus.ESCALATED,
      metadata: { ...dispute.metadata, escalationReason: input.reason, escalatedById: input.escalatedById },
    });
    if (!updated.ok) return updated;
    await this.notifier.onDisputeEscalated(updated.value);
    return updated;
  }

  /** Withdraw a dispute — only the initiator may do so. */
  async withdrawDispute(input: WithdrawDisputeInput): Promise<Result<Dispute>> {
    const found = await this.repo.findById(input.disputeId);
    if (!found.ok) return found;

    const dispute = found.value;

    if (dispute.initiatorId !== input.withdrawnById) {
      return err(new DisputeAccessDeniedError(input.disputeId, input.withdrawnById, "withdraw"));
    }

    const allowed = ALLOWED_TRANSITIONS[dispute.status];
    if (!allowed.includes(DisputeStatus.WITHDRAWN)) {
      return err(new InvalidDisputeTransitionError(dispute.status, DisputeStatus.WITHDRAWN));
    }

    const updated = await this.repo.update(input.disputeId, { status: DisputeStatus.WITHDRAWN });
    if (!updated.ok) return updated;
    await this.notifier.onDisputeWithdrawn(updated.value);
    return updated;
  }

  /** Hard-delete a dispute record (admin use only). */
  async deleteDispute(id: string): Promise<Result<Dispute>> {
    return this.repo.delete(id);
  }
}
