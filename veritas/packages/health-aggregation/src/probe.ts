// Liveness and readiness probe implementations wrapping the health aggregator.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { HealthCheck } from "./health-check.js";
import { aggregateHealth } from "./aggregator.js";
import type { HealthSnapshot } from "./types.js";

/** Result of a probe evaluation: pass/fail with attached snapshot. */
export interface ProbeResult {
  readonly pass: boolean;
  readonly snapshot: HealthSnapshot;
}

/**
 * Liveness probe: returns pass if the process is alive (no checks needed).
 * Fails only when fundamental checks (tagged "liveness") are unhealthy.
 */
export async function livenessProbe(
  checks: readonly HealthCheck[]
): Promise<Result<ProbeResult, Error>> {
  const liveness = checks.filter((c) => (c as HealthCheckWithTags).tags?.includes("liveness") ?? false);
  const target = liveness.length > 0 ? liveness : checks;
  const result = await aggregateHealth(target);
  if (!result.ok) return err(result.error as Error);
  const pass = result.value.status !== "unhealthy";
  return ok({ pass, snapshot: result.value });
}

/**
 * Readiness probe: returns pass only when all checks are healthy or degraded
 * (i.e. the service can handle traffic). Fails on unhealthy status.
 */
export async function readinessProbe(
  checks: readonly HealthCheck[]
): Promise<Result<ProbeResult, Error>> {
  const result = await aggregateHealth(checks);
  if (!result.ok) return err(result.error as Error);
  const pass = result.value.status !== "unhealthy";
  return ok({ pass, snapshot: result.value });
}

/** Startup probe: passes only when ALL checks report healthy (no degraded). */
export async function startupProbe(
  checks: readonly HealthCheck[]
): Promise<Result<ProbeResult, Error>> {
  const result = await aggregateHealth(checks);
  if (!result.ok) return err(result.error as Error);
  const pass = result.value.status === "healthy";
  return ok({ pass, snapshot: result.value });
}

/** Internal: allows health checks to carry optional tags for probe filtering. */
interface HealthCheckWithTags extends HealthCheck {
  readonly tags?: readonly string[];
}
