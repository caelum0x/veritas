// Runtime supervisor: manages the CAP provider event loop and periodic health logging.

import type { Logger } from "@veritas/core";
import { sleep } from "@veritas/core";
import type { VeritasProvider } from "@veritas/cap/provider.js";
import { getAgentHealth } from "./health.js";

/** How often (ms) the supervisor logs a health snapshot. */
const HEALTH_LOG_INTERVAL_MS = 60_000;

/** How long (ms) to wait before retrying a failed start. */
const START_RETRY_DELAY_MS = 5_000;

/** Maximum number of top-level start retries before the supervisor gives up. */
const MAX_START_RETRIES = 3;

/** Options that control runtime supervisor behaviour. */
export interface RuntimeOptions {
  /** Override the health log interval in milliseconds. */
  readonly healthLogIntervalMs?: number;
  /** Override the max start retries. */
  readonly maxStartRetries?: number;
}

/**
 * Start the CAP provider and supervise its lifecycle.
 * Logs periodic health snapshots and retries on transient startup failures.
 * Resolves when the provider stops (either gracefully or after exhausting retries).
 */
export async function runSupervisor(
  provider: VeritasProvider,
  logger: Logger,
  opts: RuntimeOptions = {},
): Promise<void> {
  const healthLogIntervalMs = opts.healthLogIntervalMs ?? HEALTH_LOG_INTERVAL_MS;
  const maxStartRetries = opts.maxStartRetries ?? MAX_START_RETRIES;

  let healthTimer: ReturnType<typeof setInterval> | null = null;

  function startHealthLog(): void {
    healthTimer = setInterval(() => {
      void (async () => {
        try {
          const report = await getAgentHealth(provider);
          logger.info("cap-agent: health snapshot", {
            status: report.status,
            checkedAt: report.checkedAt,
            components: report.components.map((c) => ({
              name: c.name,
              status: c.status,
              latencyMs: c.latencyMs,
            })),
            metrics: provider.metrics.snapshot(),
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn("cap-agent: health log failed", { error: message });
        }
      })();
    }, healthLogIntervalMs);
  }

  function stopHealthLog(): void {
    if (healthTimer !== null) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  let attempt = 0;

  while (attempt < maxStartRetries) {
    attempt++;
    logger.info("cap-agent: supervisor starting provider", { attempt, maxStartRetries });

    try {
      startHealthLog();
      await provider.start();
      // provider.start() resolves when the event loop exits
      stopHealthLog();
      logger.info("cap-agent: provider exited cleanly");
      return;
    } catch (err: unknown) {
      stopHealthLog();
      const message = err instanceof Error ? err.message : String(err);
      logger.error("cap-agent: provider start failed", {
        attempt,
        maxStartRetries,
        error: message,
      });

      if (attempt >= maxStartRetries) {
        logger.error("cap-agent: supervisor giving up after max retries", { attempt });
        throw new Error(`CAP provider failed to start after ${attempt} attempts: ${message}`);
      }

      logger.info("cap-agent: supervisor waiting before retry", {
        retryDelayMs: START_RETRY_DELAY_MS,
      });
      await sleep(START_RETRY_DELAY_MS);
    }
  }
}
