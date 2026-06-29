// Poll-and-dispatch loop that drives job processing from the queue.
import { Logger, sleep, isOk, isErr } from "@veritas/core";
import { Queue } from "./queue/queue.js";
import { Dispatcher } from "./dispatcher.js";
import { WorkerConfig } from "./config.js";

export interface WorkerState {
  readonly running: boolean;
  readonly processed: number;
  readonly failed: number;
  readonly startedAt: Date;
}

export class Worker {
  private running = false;
  private processed = 0;
  private failed = 0;
  private readonly startedAt: Date;

  constructor(
    private readonly queue: Queue,
    private readonly dispatcher: Dispatcher,
    private readonly config: WorkerConfig,
    private readonly logger: Logger
  ) {
    this.startedAt = new Date();
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn("Worker already running");
      return;
    }
    this.running = true;
    this.logger.info("Worker started", {
      pollIntervalMs: this.config.pollIntervalMs,
      concurrency: this.config.concurrency,
    });

    while (this.running) {
      await this.poll();
      await sleep(this.config.pollIntervalMs);
    }

    this.logger.info("Worker stopped", { processed: this.processed, failed: this.failed });
  }

  stop(): void {
    this.running = false;
  }

  state(): WorkerState {
    return {
      running: this.running,
      processed: this.processed,
      failed: this.failed,
      startedAt: this.startedAt,
    };
  }

  private async poll(): Promise<void> {
    const dequeueResult = await this.queue.dequeue({ limit: this.config.concurrency });
    if (isErr(dequeueResult)) {
      const deqErrMsg = dequeueResult.error instanceof Error ? dequeueResult.error.message : String(dequeueResult.error);
      this.logger.error("Dequeue error", { error: deqErrMsg });
      return;
    }

    const jobs = dequeueResult.value;
    if (jobs.length === 0) return;

    this.logger.debug("Dispatching jobs", { count: jobs.length });

    await Promise.all(
      jobs.map(async (job) => {
        const result = await this.dispatcher.dispatch(job);
        if (isOk(result)) {
          await this.queue.complete(job.id);
          this.processed++;
          this.logger.info("Job completed", { jobId: job.id, type: job.type });
        } else {
          const msg = result.error instanceof Error ? result.error.message : String(result.error);
          await this.queue.fail(job.id, msg);
          this.failed++;
          this.logger.warn("Job failed", { jobId: job.id, type: job.type, error: msg });
        }
      })
    );
  }
}

/** Factory function to create a Worker instance. */
export function createWorker(
  queue: Queue,
  dispatcher: Dispatcher,
  config: WorkerConfig,
  logger: Logger
): Worker {
  return new Worker(queue, dispatcher, config, logger);
}
