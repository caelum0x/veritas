// Compose and start/stop a set of named background workers as a unit.

import type { Worker, WorkerCompositionOptions } from "./types.js";
import { WorkerStartError, WorkerStopError } from "./errors.js";

/**
 * Starts all workers in the composition.
 * If `continueOnError` is false (default), the first failure aborts the rest.
 * Returns an array of workers that were successfully started.
 */
export async function startWorkers(
  options: WorkerCompositionOptions,
): Promise<readonly Worker[]> {
  const { workers, logger, continueOnError = false } = options;
  const started: Worker[] = [];

  for (const worker of workers) {
    try {
      logger.info("Starting worker", { worker: worker.name });
      await worker.start();
      started.push(worker);
      logger.info("Worker started", { worker: worker.name });
    } catch (cause: unknown) {
      const err = new WorkerStartError(worker.name, cause);
      logger.error("Worker failed to start", {
        worker: worker.name,
        error: err.message,
      });
      if (!continueOnError) {
        throw err;
      }
    }
  }

  return started;
}

/**
 * Stops all workers in reverse start order.
 * Collects errors rather than aborting on the first failure so all workers
 * get a chance to shut down cleanly.
 */
export async function stopWorkers(
  workers: readonly Worker[],
  logger: { info: (msg: string, ctx?: Record<string, unknown>) => void; error: (msg: string, ctx?: Record<string, unknown>) => void },
): Promise<void> {
  const errors: WorkerStopError[] = [];

  for (const worker of [...workers].reverse()) {
    try {
      logger.info("Stopping worker", { worker: worker.name });
      await worker.stop();
      logger.info("Worker stopped", { worker: worker.name });
    } catch (cause: unknown) {
      const err = new WorkerStopError(worker.name, cause);
      errors.push(err);
      logger.error("Worker failed to stop", {
        worker: worker.name,
        error: err.message,
      });
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `${errors.length} worker(s) failed to stop cleanly`,
    );
  }
}

/**
 * Composes workers into a single {@link Worker}-compatible object that starts
 * and stops all members as a group.
 */
export function composeWorkers(options: WorkerCompositionOptions): Worker {
  let started: readonly Worker[] = [];

  return {
    name: "ComposedWorkerGroup",
    async start(): Promise<void> {
      started = await startWorkers(options);
    },
    async stop(): Promise<void> {
      await stopWorkers(started, options.logger);
      started = [];
    },
  };
}
