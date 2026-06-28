// Runner — selects and executes due jobs from the registry with lock and backoff
import { type Logger, noopLogger } from "@veritas/core";
import { type TickableClock, realTickableClock } from "./clock.js";
import { type JobRegistry } from "./registry.js";
import { type DistributedLock } from "./lock.js";
import { type BackoffPolicy, noBackoff } from "./backoff.js";
import { type ScheduledJob, type JobHandler } from "./job.js";
import { type Schedule, nextRunAt } from "./schedule.js";

export interface RunnerOptions {
  readonly clock?: TickableClock;
  readonly lock?: DistributedLock;
  readonly backoff?: BackoffPolicy;
  readonly logger?: Logger;
  /** Maximum concurrent jobs (default: 4). */
  readonly concurrency?: number;
}

export interface RunResult {
  readonly jobId: string;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly success: boolean;
  readonly error?: unknown;
}

function isDue(schedule: Schedule, nowMs: number): boolean {
  if (schedule.kind === "interval") {
    // interval schedules are always "due" — caller controls frequency
    return true;
  }
  if (schedule.kind === "once") {
    return nowMs >= new Date(schedule.at).getTime();
  }
  if (schedule.kind === "cron") {
    const next = nextRunAt(schedule, new Date(nowMs - 1));
    return next !== null && next.getTime() <= nowMs;
  }
  return false;
}

async function runJob(
  job: ScheduledJob,
  handler: JobHandler,
  lock: DistributedLock,
  backoff: BackoffPolicy,
  logger: Logger,
  nowMs: number
): Promise<RunResult> {
  const startedAt = nowMs;
  const acquired = await lock.acquire(job.id, 30_000);
  if (!acquired) {
    return { jobId: job.id, startedAt, finishedAt: Date.now(), success: false, error: "lock_not_acquired" };
  }
  let attempt = 0;
  let lastError: unknown;
  const maxAttempts = job.maxRetries != null ? job.maxRetries + 1 : 1;
  try {
    while (attempt < maxAttempts) {
      try {
        await handler({
          jobId: job.id,
          jobName: job.name,
          scheduledAt: new Date(nowMs),
          payload: job.payload,
          attempt: attempt + 1,
        });
        return { jobId: job.id, startedAt, finishedAt: Date.now(), success: true };
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt < maxAttempts) {
          const delayMs = backoff.nextDelay(attempt);
          logger.warn("job_retry", { jobId: job.id, attempt, delayMs, error: String(err) });
          await new Promise<void>((res) => setTimeout(res, delayMs));
        }
      }
    }
    logger.error("job_failed", { jobId: job.id, attempts: attempt, error: String(lastError) });
    return { jobId: job.id, startedAt, finishedAt: Date.now(), success: false, error: lastError };
  } finally {
    await lock.release(job.id);
  }
}

export interface JobRunner {
  /** Run all due jobs now and return their results. */
  runDue(): Promise<RunResult[]>;
}

export function createJobRunner(
  registry: JobRegistry,
  handlers: ReadonlyMap<string, JobHandler>,
  options: RunnerOptions = {}
): JobRunner {
  const clock = options.clock ?? realTickableClock();
  const lock = options.lock ?? noopLock();
  const backoff = options.backoff ?? noBackoff();
  const logger: Logger = options.logger ?? noopLogger;
  const concurrency = options.concurrency ?? 4;

  return {
    async runDue(): Promise<RunResult[]> {
      const nowMs = clock.now();
      const due = registry.list().filter((j) => isDue(j.schedule, nowMs));
      const results: RunResult[] = [];
      // process in chunks up to concurrency
      for (let i = 0; i < due.length; i += concurrency) {
        const batch = due.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map((job) => {
            const handler = handlers.get(job.id);
            if (!handler) {
              const result: RunResult = {
                jobId: job.id,
                startedAt: nowMs,
                finishedAt: Date.now(),
                success: false,
                error: "no_handler",
              };
              return Promise.resolve(result);
            }
            return runJob(job, handler, lock, backoff, logger, nowMs);
          })
        );
        results.push(...batchResults);
      }
      return results;
    },
  };
}

function noopLock(): DistributedLock {
  return {
    async acquire(_id: string, _ttlMs: number): Promise<boolean> { return true; },
    async release(_id: string): Promise<void> { /* no-op */ },
  };
}
