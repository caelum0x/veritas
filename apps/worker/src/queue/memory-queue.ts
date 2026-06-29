// In-memory queue implementation suitable for single-process workers and testing.
import { Result, ok, err, InternalError, NotFoundError, epochToIso, IsoTimestamp } from "@veritas/core";
import { Job, JobType, JobStatus, makeJob, withStatus } from "./job.js";
import { Queue, EnqueueOptions, DequeueOptions } from "./queue.js";

export class MemoryQueue implements Queue {
  private readonly jobs = new Map<string, Job<unknown>>();

  async enqueue<TPayload>(
    type: JobType,
    payload: TPayload,
    options: EnqueueOptions = {}
  ): Promise<Result<Job<TPayload>>> {
    try {
      const job = makeJob(type, payload, {
        scheduledAt: options.scheduledAt as IsoTimestamp | undefined,
        maxAttempts: options.maxAttempts,
      });
      this.jobs.set(job.id, job as Job<unknown>);
      return ok(job);
    } catch (e) {
      return err(new InternalError({ message: `Failed to enqueue job: ${String(e)}` }));
    }
  }

  async dequeue(options: DequeueOptions = {}): Promise<Result<ReadonlyArray<Job<unknown>>>> {
    try {
      const now = Date.now();
      const limit = options.limit ?? 10;
      const types = options.types;

      const ready: Job<unknown>[] = [];
      for (const job of this.jobs.values()) {
        if (job.status !== "pending") continue;
        if (types && !types.includes(job.type)) continue;
        const scheduledMs = new Date(job.scheduledAt).getTime();
        if (scheduledMs > now) continue;
        ready.push(job);
        if (ready.length >= limit) break;
      }

      const nowIso = epochToIso(now);
      const running = ready.map((job) => {
        const updated = withStatus(job, "running", { runAt: nowIso });
        this.jobs.set(updated.id, updated);
        return updated;
      });

      return ok(running);
    } catch (e) {
      return err(new InternalError({ message: `Failed to dequeue: ${String(e)}` }));
    }
  }

  async complete(jobId: string): Promise<Result<Job<unknown>>> {
    const job = this.jobs.get(jobId);
    if (!job) return err(new NotFoundError({ message: `Job ${jobId} not found` }));
    const updated = withStatus(job, "completed", { completedAt: epochToIso(Date.now()) });
    this.jobs.set(jobId, updated);
    return ok(updated);
  }

  async fail(jobId: string, error: string): Promise<Result<Job<unknown>>> {
    const job = this.jobs.get(jobId);
    if (!job) return err(new NotFoundError({ message: `Job ${jobId} not found` }));

    const nextAttempts = job.attempts; // already incremented on dequeue
    const isDead = nextAttempts >= job.maxAttempts;

    let updated: Job<unknown>;
    if (isDead) {
      updated = withStatus(job, "dead", {
        failedAt: epochToIso(Date.now()),
        lastError: error,
      });
    } else {
      // Re-queue with exponential back-off delay
      const delayMs = Math.min(1000 * 2 ** nextAttempts, 60_000);
      const retryAt = epochToIso(Date.now() + delayMs);
      updated = {
        ...job,
        status: "pending" as JobStatus,
        scheduledAt: retryAt,
        runAt: null,
        lastError: error,
        failedAt: epochToIso(Date.now()),
      };
    }

    this.jobs.set(jobId, updated);
    return ok(updated);
  }

  async list(type?: JobType): Promise<Result<ReadonlyArray<Job<unknown>>>> {
    const all = Array.from(this.jobs.values());
    const filtered = type ? all.filter((j) => j.type === type) : all;
    return ok(filtered);
  }

  async depth(): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === "pending" || job.status === "running") count++;
    }
    return count;
  }
}
