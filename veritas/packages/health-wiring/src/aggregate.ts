// Aggregate platform health by running all registered checks and reducing to a single snapshot.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { HealthSnapshot, DegradationPolicy } from "@veritas/health-aggregation";
import { runHealthChecks } from "@veritas/observability";
import type { HealthCheckResult } from "@veritas/observability";
import type { CheckRegistry } from "./register-checks.js";
import { HealthAggregationError } from "./errors.js";

/** Compute aggregate HealthStatus from a list of observability results using a policy. */
function reduceStatus(
  results: readonly HealthCheckResult[],
  policy: DegradationPolicy,
): "healthy" | "degraded" | "unhealthy" {
  if (results.length === 0) return "healthy";
  const unhealthyCount = results.filter((r) => r.status === "unhealthy").length;
  const degradedCount = results.filter((r) => r.status === "degraded").length;
  const total = results.length;

  if (unhealthyCount / total > 1 - policy.criticalThreshold) return "unhealthy";
  if ((unhealthyCount + degradedCount) / total > 1 - policy.nonCriticalThreshold) return "degraded";
  return "healthy";
}

/** Default degradation policy: any unhealthy = unhealthy, >50% degraded = degraded. */
export const DEFAULT_DEGRADATION_POLICY: DegradationPolicy = {
  criticalThreshold: 1.0,
  nonCriticalThreshold: 0.5,
};

/** Run all registered checks and produce a HealthSnapshot. */
export async function aggregatePlatformHealth(
  registry: CheckRegistry,
  version?: string,
  policy: DegradationPolicy = DEFAULT_DEGRADATION_POLICY,
): Promise<Result<HealthSnapshot, HealthAggregationError>> {
  try {
    const report = await runHealthChecks(registry.obsChecks);
    const status = reduceStatus(report.components, policy);

    const snapshot: HealthSnapshot = {
      status,
      checks: report.components.map((c) => ({
        name: c.name,
        status: c.status,
        latencyMs: c.latencyMs ?? 0,
        checkedAt: report.checkedAt,
        error: c.message,
        metadata: (c.metadata ?? {}) as Record<string, unknown>,
      })),
      timestamp: report.checkedAt,
      version,
    };

    return ok(snapshot);
  } catch (cause) {
    return err(
      new HealthAggregationError(
        cause instanceof Error ? cause.message : String(cause),
      ),
    );
  }
}
