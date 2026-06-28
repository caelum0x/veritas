// DisputeNotifier port implementations: console (dev) and no-op (test) adapters.

import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { Dispute } from "./dispute.js";
import type { DisputeNotifier } from "./types.js";

/** No-op implementation that silently drops all notifications. */
export class NoopDisputeNotifier implements DisputeNotifier {
  async onDisputeOpened(_dispute: Dispute): Promise<void> {}
  async onDisputeUnderReview(_dispute: Dispute): Promise<void> {}
  async onDisputeResolved(_dispute: Dispute): Promise<void> {}
  async onDisputeEscalated(_dispute: Dispute): Promise<void> {}
  async onDisputeWithdrawn(_dispute: Dispute): Promise<void> {}
}

/** Console-logging implementation that emits structured log lines via pino-compatible Logger. */
export class LoggingDisputeNotifier implements DisputeNotifier {
  constructor(private readonly logger: Logger = noopLogger) {}

  async onDisputeOpened(dispute: Dispute): Promise<void> {
    this.logger.info("Dispute opened", { event: "dispute.opened", disputeId: dispute.id, claimId: dispute.claimId });
  }

  async onDisputeUnderReview(dispute: Dispute): Promise<void> {
    this.logger.info("Dispute moved to review", {
      event: "dispute.under_review",
      disputeId: dispute.id,
      arbitratorId: dispute.arbitratorId,
    });
  }

  async onDisputeResolved(dispute: Dispute): Promise<void> {
    this.logger.info("Dispute resolved", {
      event: "dispute.resolved",
      disputeId: dispute.id,
      resolution: dispute.resolution,
    });
  }

  async onDisputeEscalated(dispute: Dispute): Promise<void> {
    this.logger.info("Dispute escalated", { event: "dispute.escalated", disputeId: dispute.id });
  }

  async onDisputeWithdrawn(dispute: Dispute): Promise<void> {
    this.logger.info("Dispute withdrawn", { event: "dispute.withdrawn", disputeId: dispute.id });
  }
}

/** Composite notifier that fans out to multiple downstream notifiers in parallel. */
export class CompositeDisputeNotifier implements DisputeNotifier {
  private readonly notifiers: ReadonlyArray<DisputeNotifier>;

  constructor(...notifiers: DisputeNotifier[]) {
    this.notifiers = notifiers;
  }

  async onDisputeOpened(dispute: Dispute): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.onDisputeOpened(dispute)));
  }

  async onDisputeUnderReview(dispute: Dispute): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.onDisputeUnderReview(dispute)));
  }

  async onDisputeResolved(dispute: Dispute): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.onDisputeResolved(dispute)));
  }

  async onDisputeEscalated(dispute: Dispute): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.onDisputeEscalated(dispute)));
  }

  async onDisputeWithdrawn(dispute: Dispute): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.onDisputeWithdrawn(dispute)));
  }
}
