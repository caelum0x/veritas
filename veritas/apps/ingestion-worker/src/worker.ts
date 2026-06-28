// worker: poll-loop that drains the job queue with bounded concurrency.

import { pLimit } from "@veritas/core";
import type { Logger } from "@veritas/core";
import { InMemoryJobStore, IngestionPipeline } from "@veritas/ingestion";
import type { JobQueue } from "./queue.js";
import type { WorkerConfig } from "./config.js";
import { handleJob } from "./handler.js";
import type { HandlerDeps } from "./handler.js";
import type { ToVerificationOptions } from "./to-verification.js";

export interface WorkerDeps {
  readonly queue: JobQueue;
  readonly pipeline: IngestionPipeline;
  readonly jobStore: InMemoryJobStore;
  readonly logger: Logger;
  readonly config: WorkerConfig;
  readonly verificationOptions?: ToVerificationOptions;
}

export interface Worker {
  /** Start the poll loop. Resolves when stop() is called and in-flight jobs finish. */
  start(): Promise<void>;
  /** Signal the worker to stop accepting new jobs. */
  stop(): void;
  /** Whether the worker is currently running. */
  readonly running: boolean;
}

/** Create a poll-loop worker that processes jobs from the queue with concurrency control. */
export function createWorker(deps: WorkerDeps): Worker {
  const { queue, pipeline, jobStore, logger, config, verificationOptions } = deps;

  let active = false;
  let shouldStop = false;

  const handlerDeps: HandlerDeps = {
    pipeline,
    jobStore,
    logger,
    config,
    verificationOptions,
  };

  async function drainBatch(limit: ReturnType<typeof pLimit>): Promise<void> {
    const tasks: Promise<void>[] = [];

    while (queue.size() > 0) {
      const queued = queue.dequeue();
      if (queued == null) break;

      const task = limit(async () => {
        const result = await handleJob(queued, handlerDeps);
        if (!result.ok) {
          logger.error("worker: job failed", {
            jobId: queued.id,
            sourceUrl: queued.sourceUrl,
            code: result.error.code,
            message: result.error.message,
          });
        } else {
          logger.info("worker: job succeeded", {
            jobId: result.value.jobId,
            documentId: result.value.documentId,
            chunkCount: result.value.chunkCount,
            durationMs: result.value.durationMs,
          });
        }
      });

      tasks.push(task);
    }

    await Promise.all(tasks);
  }

  async function pollLoop(): Promise<void> {
    const limit = pLimit(config.concurrency);

    while (!shouldStop) {
      if (queue.size() > 0) {
        await drainBatch(limit);
      } else {
        await sleep(config.pollIntervalMs);
      }
    }

    // Drain any remaining items before exiting.
    if (queue.size() > 0) {
      await drainBatch(limit);
    }
  }

  return {
    get running() {
      return active;
    },

    async start() {
      if (active) return;
      active = true;
      shouldStop = false;
      logger.info("worker: started", { concurrency: config.concurrency });
      try {
        await pollLoop();
      } finally {
        active = false;
        logger.info("worker: stopped");
      }
    },

    stop() {
      shouldStop = true;
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
