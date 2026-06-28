// Runs all registered health checks in parallel and produces a HealthSnapshot.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { HealthCheck } from "./health-check.js";
import type { HealthSnapshot, HealthStatus, HealthCheckResult } from "./types.js";
import { HealthAggregationError } from "./errors.js";

/** Options controlling how the aggregator runs checks. */
export interface AggregatorOptions {
  readonly version?: string;
  readonly concurrency?: number;
}

/** Aggregate all health checks into a snapshot, running them in parallel. */
export async function aggregateHealth(
  checks: readonly HealthCheck[],
  opts: AggregatorOptions = {}
): Promise<Result<HealthSnapshot, HealthAggregationError>> {
  if (checks.length === 0) {
    const snapshot: HealthSnapshot = {
      status: "healthy",
      checks: [],
      timestamp: new Date().toISOString(),
      version: opts.version,
    };
    return ok(snapshot);
  }

  let results: HealthCheckResult[];
  try {
    const settled = await Promise.allSettled(checks.map((c) => c.execute()));
    results = settled.map((s, i): HealthCheckResult => {
      if (s.status === "fulfilled" && s.value.ok) {
        return s.value.value;
      }
      const reason = s.status === "rejected" ? String(s.reason) : "unknown error";
      const checkName = checks[i]?.name ?? `check-${i}`;
      return {
        name: checkName,
        status: "unhealthy",
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
        error: reason,
        metadata: {},
      };
    });
  } catch (cause) {
    return err(new HealthAggregationError(`Aggregation failed: ${cause}`));
  }

  const status = deriveOverallStatus(results);
  const snapshot: HealthSnapshot = {
    status,
    checks: results,
    timestamp: new Date().toISOString(),
    version: opts.version,
  };
  return ok(snapshot);
}

/** Derive overall status: unhealthy if any unhealthy, degraded if any degraded, else healthy. */
function deriveOverallStatus(results: readonly HealthCheckResult[]): HealthStatus {
  if (results.some((r) => r.status === "unhealthy")) return "unhealthy";
  if (results.some((r) => r.status === "degraded")) return "degraded";
  return "healthy";
}
