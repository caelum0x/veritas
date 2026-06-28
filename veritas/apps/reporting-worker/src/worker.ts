// Scheduled worker loop — polls the job queue and processes report generation jobs.
import { sleep } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { HandlerDeps } from "./handler.js";
import { handleNextJob } from "./handler.js";

export interface WorkerConfig {
  /** Milliseconds to wait between poll cycles when the queue is empty. */
  readonly pollIntervalMs: number;
  /** Maximum number of consecutive errors before the worker backs off. */
  readonly maxConsecutiveErrors: number;
  /** Milliseconds to back off when maxConsecutiveErrors is reached. */
  readonly backoffMs: number;
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  pollIntervalMs: 5_000,
  maxConsecutiveErrors: 5,
  backoffMs: 30_000,
};

export interface WorkerState {
  readonly running: boolean;
  readonly totalProcessed: number;
  readonly totalErrors: number;
  readonly consecutiveErrors: number;
}

/** Creates an initial worker state. */
function makeState(): WorkerState {
  return { running: true, totalProcessed: 0, totalErrors: 0, consecutiveErrors: 0 };
}

/** Run the worker loop until `signal.running` becomes false. */
export async function runWorkerLoop(
  deps: HandlerDeps,
  config: WorkerConfig = DEFAULT_WORKER_CONFIG,
  signal: { running: boolean },
): Promise<WorkerState> {
  const logger: Logger = deps.logger;
  let state = makeState();

  logger.info("Reporting worker started", { config });

  while (signal.running) {
    try {
      const result = await handleNextJob(deps);

      if (!result.processed) {
        // Queue was empty — wait before next poll
        await sleep(config.pollIntervalMs);
        state = { ...state, consecutiveErrors: 0 };
        continue;
      }

      if (result.error) {
        state = {
          ...state,
          totalErrors: state.totalErrors + 1,
          consecutiveErrors: state.consecutiveErrors + 1,
        };

        if (state.consecutiveErrors >= config.maxConsecutiveErrors) {
          logger.warn("Too many consecutive errors, backing off", {
            consecutiveErrors: state.consecutiveErrors,
            backoffMs: config.backoffMs,
          });
          await sleep(config.backoffMs);
          state = { ...state, consecutiveErrors: 0 };
        }
      } else {
        state = {
          ...state,
          totalProcessed: state.totalProcessed + 1,
          consecutiveErrors: 0,
        };
      }
    } catch (unexpected: unknown) {
      const message = unexpected instanceof Error ? unexpected.message : String(unexpected);
      logger.error("Unexpected worker error", { error: message });
      state = {
        ...state,
        totalErrors: state.totalErrors + 1,
        consecutiveErrors: state.consecutiveErrors + 1,
      };
      await sleep(config.pollIntervalMs);
    }
  }

  logger.info("Reporting worker stopped", {
    totalProcessed: state.totalProcessed,
    totalErrors: state.totalErrors,
  });

  return state;
}
