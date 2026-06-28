// Readiness probe wiring: reports whether the platform is ready to serve traffic.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { HealthSnapshot } from "@veritas/health-aggregation";
import type { Logger } from "@veritas/core";
import { aggregatePlatformHealth, DEFAULT_DEGRADATION_POLICY } from "./aggregate.js";
import type { CheckRegistry } from "./register-checks.js";
import { HealthAggregationError } from "./errors.js";

/** Readiness probe result: ready status plus a snapshot for diagnostics. */
export interface ReadinessResult {
  readonly ready: boolean;
  readonly snapshot: HealthSnapshot;
}

/** Ports consumed by the readiness probe. */
export interface ReadinessPorts {
  readonly registry: CheckRegistry;
  readonly logger: Logger;
  readonly version?: string;
}

/**
 * Execute the readiness probe.
 * Ready = aggregate status is "healthy" or "degraded" (not "unhealthy").
 */
export async function checkReadiness(
  ports: ReadinessPorts,
): Promise<Result<ReadinessResult, HealthAggregationError>> {
  ports.logger.info("Running readiness probe");

  const result = await aggregatePlatformHealth(
    ports.registry,
    ports.version,
    DEFAULT_DEGRADATION_POLICY,
  );

  if (!result.ok) {
    ports.logger.error("Readiness probe aggregation failed", {
      error: result.error.message,
    });
    return err(result.error);
  }

  const snapshot = result.value;
  const ready = snapshot.status !== "unhealthy";

  ports.logger.info("Readiness probe complete", {
    ready,
    status: snapshot.status,
  });

  return ok({ ready, snapshot });
}
