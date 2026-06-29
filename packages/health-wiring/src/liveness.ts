// Liveness probe wiring: reports whether the process is alive and should not be restarted.
import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";
import type { Logger } from "@veritas/core";

/** Liveness probe result returned to the orchestrator. */
export interface LivenessResult {
  readonly alive: boolean;
  readonly uptimeMs: number;
  readonly checkedAt: string;
  readonly pid: number;
}

/** Ports consumed by the liveness probe. */
export interface LivenessPorts {
  readonly logger: Logger;
  readonly startedAt: Date;
}

/**
 * Execute the liveness probe.
 * Liveness is purely in-process: if this function returns, the process is alive.
 * Kubernetes should restart the container only if this endpoint fails to respond.
 */
export function checkLiveness(
  ports: LivenessPorts,
): Result<LivenessResult, never> {
  const now = new Date();
  const uptimeMs = now.getTime() - ports.startedAt.getTime();

  ports.logger.info("Liveness probe", { uptimeMs, pid: process.pid });

  return ok({
    alive: true,
    uptimeMs,
    checkedAt: now.toISOString(),
    pid: process.pid,
  });
}
