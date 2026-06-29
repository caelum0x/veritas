// Start and supervise all background workers for the platform process.

import type { Logger } from "@veritas/core";
import type { Worker } from "@veritas/composition";

export interface WorkerSupervisorOptions {
  readonly workers: readonly Worker[];
  readonly logger: Logger;
  readonly continueOnError?: boolean;
}

export interface WorkerSupervisor {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Supervise a set of background workers as a single lifecycle component. */
export function buildWorkerSupervisor(opts: WorkerSupervisorOptions): WorkerSupervisor {
  const { workers, logger, continueOnError = false } = opts;

  return {
    name: "worker-supervisor",

    async start(): Promise<void> {
      logger.info("Starting background workers", { count: workers.length });
      for (const w of workers) {
        try {
          await w.start();
          logger.info("Worker started", { worker: w.name });
        } catch (err) {
          logger.error("Worker failed to start", {
            worker: w.name,
            error: err instanceof Error ? err.message : String(err),
          });
          if (!continueOnError) throw err;
        }
      }
    },

    async stop(): Promise<void> {
      logger.info("Stopping background workers", { count: workers.length });
      const reversed = [...workers].reverse();
      for (const w of reversed) {
        try {
          await w.stop();
          logger.info("Worker stopped", { worker: w.name });
        } catch (err) {
          logger.error("Worker failed to stop", {
            worker: w.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
  };
}
