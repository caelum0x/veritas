// Cron-like scheduler that enqueues jobs on a fixed interval or schedule.
import { Logger, noopLogger, epochToIso } from "@veritas/core";
import { Queue } from "./queue/queue.js";
import { JobType } from "./queue/job.js";

export interface ScheduleEntry {
  readonly type: JobType;
  /** Interval in milliseconds between job enqueues. */
  readonly intervalMs: number;
  /** Optional static payload to attach to every scheduled job. */
  readonly payload?: unknown;
  readonly maxAttempts?: number;
}

export interface SchedulerConfig {
  readonly entries: ReadonlyArray<ScheduleEntry>;
  readonly logger?: Logger;
}

interface TimerState {
  readonly entry: ScheduleEntry;
  handle: ReturnType<typeof setInterval> | null;
}

export class Scheduler {
  private readonly states: TimerState[] = [];
  private readonly logger: Logger;
  private running = false;

  constructor(
    private readonly queue: Queue,
    private readonly config: SchedulerConfig
  ) {
    this.logger = config.logger ?? noopLogger;
    for (const entry of config.entries) {
      this.states.push({ entry, handle: null });
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const state of this.states) {
      const handle = setInterval(() => {
        void this.enqueueEntry(state.entry);
      }, state.entry.intervalMs);
      (state as { handle: ReturnType<typeof setInterval> | null }).handle = handle;
      this.logger.info("scheduler: registered entry", {
        type: state.entry.type,
        intervalMs: state.entry.intervalMs,
      });
    }
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    for (const state of this.states) {
      if (state.handle !== null) {
        clearInterval(state.handle);
        (state as { handle: ReturnType<typeof setInterval> | null }).handle = null;
      }
    }
    this.logger.info("scheduler: stopped");
  }

  private async enqueueEntry(entry: ScheduleEntry): Promise<void> {
    const now = epochToIso(Date.now());
    const result = await this.queue.enqueue(
      entry.type,
      entry.payload ?? {},
      { scheduledAt: now, maxAttempts: entry.maxAttempts }
    );
    if (result.ok) {
      this.logger.info("scheduler: enqueued job", { type: entry.type, jobId: result.value.id });
    } else {
      const schedErrMsg = result.error instanceof Error ? result.error.message : String(result.error);
      this.logger.error("scheduler: failed to enqueue job", {
        type: entry.type,
        error: schedErrMsg,
      });
    }
  }
}
