// Periodic scheduler that triggers PublisherService.publishBatch on a fixed interval.

import { isOk } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { PublisherService } from "./publisher-service.js";
import type { PublisherConfig } from "./config.js";

export type SchedulerStatus = "idle" | "running" | "stopped";

/** Drives periodic batch anchoring by calling PublisherService on a fixed interval. */
export class PublisherScheduler {
  private status: SchedulerStatus = "idle";
  private timerId: ReturnType<typeof setTimeout> | undefined = undefined;
  private cycleCount = 0;
  private errorCount = 0;

  constructor(
    private readonly service: PublisherService,
    private readonly config: PublisherConfig,
    private readonly logger: Logger,
  ) {}

  /** Start the scheduler. No-op if already running. */
  start(): void {
    if (this.status === "running") return;
    this.status = "running";
    this.logger.info("attestation publisher scheduler started", { intervalMs: this.config.intervalMs });
    this.scheduleNext();
  }

  /** Stop the scheduler gracefully. */
  stop(): void {
    this.status = "stopped";
    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
    this.logger.info("attestation publisher scheduler stopped", { cycles: this.cycleCount, errors: this.errorCount });
  }

  /** Expose runtime stats for health checks. */
  stats(): Readonly<{ status: SchedulerStatus; cycleCount: number; errorCount: number; pendingCount: number }> {
    return {
      status: this.status,
      cycleCount: this.cycleCount,
      errorCount: this.errorCount,
      pendingCount: this.service.pendingCount,
    };
  }

  private scheduleNext(): void {
    if (this.status !== "running") return;
    this.timerId = setTimeout(() => void this.tick(), this.config.intervalMs);
  }

  private async tick(): Promise<void> {
    if (this.status !== "running") return;
    this.cycleCount += 1;

    try {
      const result = await this.service.publishBatch();
      if (!isOk(result)) {
        this.errorCount += 1;
        this.logger.warn("publish cycle error", { err: result.error, cycle: this.cycleCount });
      }
    } catch (err: unknown) {
      this.errorCount += 1;
      this.logger.error("unexpected error in publish cycle", { err, cycle: this.cycleCount });
    }

    this.scheduleNext();
  }
}
