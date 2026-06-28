// Runtime supervisor: manages the orchestrator lifecycle, health logging, and graceful shutdown.

import type { Logger } from "@veritas/core";
import { sleep } from "@veritas/core";
import type { OrchestratorConfig } from "./config.js";

/** Minimal interface the supervisor requires of the orchestrator. */
export interface OrchestratorHandle {
  /** Start accepting and routing verification tasks. Resolves when stopped. */
  start(): Promise<void>;
  /** Gracefully stop the orchestrator. */
  stop(): Promise<void>;
  /** Return a snapshot of current health indicators. */
  healthSnapshot(): OrchestratorHealthSnapshot;
}

/** Point-in-time health indicators for the orchestrator. */
export interface OrchestratorHealthSnapshot {
  readonly activePipelines: number;
  readonly queuedTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly uptimeMs: number;
}

/** Options for the runtime supervisor loop. */
export interface RuntimeOptions {
  /** Override health log interval from config. */
  readonly healthLogIntervalMs?: number;
  /** Override max restart attempts from config. */
  readonly maxRestarts?: number;
  /** Override restart delay from config. */
  readonly restartDelayMs?: number;
}

/**
 * Supervise the orchestrator lifecycle: start, health-log, restart on failure.
 * Resolves when the orchestrator stops cleanly or restarts are exhausted.
 */
export async function runRuntime(
  orchestrator: OrchestratorHandle,
  config: OrchestratorConfig,
  logger: Logger,
  opts: RuntimeOptions = {},
): Promise<void> {
  const healthLogIntervalMs = opts.healthLogIntervalMs ?? config.healthLogIntervalMs;
  const maxRestarts = opts.maxRestarts ?? config.maxSupervisorRestarts;
  const restartDelayMs = opts.restartDelayMs ?? config.supervisorRestartDelayMs;

  let healthTimer: ReturnType<typeof setInterval> | null = null;
  let attempt = 0;

  function startHealthLog(): void {
    healthTimer = setInterval(() => {
      try {
        const snap = orchestrator.healthSnapshot();
        logger.info("orchestrator: health snapshot", {
          activePipelines: snap.activePipelines,
          queuedTasks: snap.queuedTasks,
          completedTasks: snap.completedTasks,
          failedTasks: snap.failedTasks,
          uptimeMs: snap.uptimeMs,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("orchestrator: health log failed", { error: message });
      }
    }, healthLogIntervalMs);
  }

  function stopHealthLog(): void {
    if (healthTimer !== null) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  while (attempt <= maxRestarts) {
    attempt++;
    logger.info("orchestrator: supervisor starting", { attempt, maxRestarts: maxRestarts + 1 });

    try {
      startHealthLog();
      await orchestrator.start();
      stopHealthLog();
      logger.info("orchestrator: supervisor exited cleanly");
      return;
    } catch (startErr: unknown) {
      stopHealthLog();
      const message = startErr instanceof Error ? startErr.message : String(startErr);
      logger.error("orchestrator: supervisor caught error", { error: message, attempt });

      if (attempt > maxRestarts) {
        logger.error("orchestrator: supervisor giving up after max restarts", { maxRestarts });
        throw startErr;
      }

      logger.info("orchestrator: supervisor will retry", { delayMs: restartDelayMs, attempt, maxRestarts });
      await sleep(restartDelayMs);
    }
  }
}

/** Register SIGINT/SIGTERM handlers to gracefully shut down the orchestrator. */
export function attachOrchestratorShutdownHandlers(
  orchestrator: OrchestratorHandle,
  logger: Logger,
): void {
  const shutdown = (signal: string): void => {
    logger.info("orchestrator: shutdown signal received", { signal });
    orchestrator.stop().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("orchestrator: error during shutdown", { error: message });
      process.exit(1);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
