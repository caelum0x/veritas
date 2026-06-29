// Scheduled enqueue: enqueues messages at a future wall-clock time via a Clock port.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Clock } from "@veritas/core";
import { systemClock } from "@veritas/core";
import type { QueueMessage } from "./types.js";
import type { PriorityQueuePort } from "./types.js";

/** A single pending scheduled entry */
interface ScheduledJob<T> {
  readonly id: string;
  readonly runAt: number; // epoch ms
  readonly message: QueueMessage<T>;
  readonly priority: number;
}

export class SchedulerError extends Error {
  constructor(detail: string) {
    super(`SchedulerError: ${detail}`);
    this.name = "SchedulerError";
  }
}

/** Options for scheduling a message */
export interface ScheduleOptions {
  /** Absolute epoch-ms at which the message should be enqueued */
  readonly runAt: number;
  /** Priority to assign when enqueuing (default: 20 / normal) */
  readonly priority?: number;
}

/** Port for scheduled enqueue operations */
export interface SchedulerPort<T> {
  schedule(message: QueueMessage<T>, options: ScheduleOptions): Result<string>;
  cancel(jobId: string): Result<void>;
  /** Flush all jobs whose runAt <= now into the target queue */
  flush(now?: number): Result<number>;
  pendingCount(): number;
}

let jobCounter = 0;

/** In-memory scheduler that flushes due jobs into a PriorityQueuePort */
export class InMemoryScheduler<T> implements SchedulerPort<T> {
  private readonly pending = new Map<string, ScheduledJob<T>>();

  constructor(
    private readonly queue: PriorityQueuePort<T>,
    private readonly clock: Clock = systemClock
  ) {}

  schedule(message: QueueMessage<T>, options: ScheduleOptions): Result<string> {
    const now = this.clock.now();
    if (options.runAt < now) {
      return err(new SchedulerError("runAt must be in the future"));
    }
    const id = `sched-${++jobCounter}`;
    const job: ScheduledJob<T> = {
      id,
      runAt: options.runAt,
      message,
      priority: options.priority ?? 20,
    };
    this.pending.set(id, job);
    return ok(id);
  }

  cancel(jobId: string): Result<void> {
    if (!this.pending.has(jobId)) {
      return err(new SchedulerError(`Job '${jobId}' not found`));
    }
    this.pending.delete(jobId);
    return ok(undefined);
  }

  /** Flush all jobs whose runAt is in the past into the underlying queue */
  flush(now: number = this.clock.now()): Result<number> {
    const due: ScheduledJob<T>[] = [];
    for (const job of this.pending.values()) {
      if (job.runAt <= now) due.push(job);
    }
    // Sort by runAt ascending so oldest jobs are enqueued first
    due.sort((a, b) => a.runAt - b.runAt);
    for (const job of due) {
      this.pending.delete(job.id);
      const result = this.queue.enqueue(job.message, job.priority);
      if (!("value" in result)) {
        return err((result as { error: unknown }).error);
      }
    }
    return ok(due.length);
  }

  pendingCount(): number {
    return this.pending.size;
  }
}
