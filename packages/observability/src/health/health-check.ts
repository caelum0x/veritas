// HealthCheck interface and aggregate status computation for liveness/readiness probes.
import { tryAsync, ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

/** Possible health states for a component or the overall system. */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/** Result of a single health check probe. */
export interface HealthCheckResult {
  /** Component name, e.g. "database", "cache", "queue". */
  readonly name: string;
  readonly status: HealthStatus;
  /** Human-readable detail about the current state. */
  readonly message?: string;
  /** Round-trip latency in milliseconds, if measurable. */
  readonly latencyMs?: number;
  /** Arbitrary component-specific metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A component that can report its own health. */
export interface HealthCheck {
  /** Stable identifier for this component. */
  readonly name: string;
  /** Execute the probe and return a result. Should not throw. */
  check(): Promise<HealthCheckResult>;
}

/** Aggregate health report returned by the /health endpoint. */
export interface AggregateHealthReport {
  /** Overall status derived from all component statuses. */
  readonly status: HealthStatus;
  /** ISO-8601 timestamp of when the report was generated. */
  readonly checkedAt: string;
  /** Individual component results. */
  readonly components: readonly HealthCheckResult[];
}

/**
 * Determine aggregate status from a list of component results.
 * - Any "unhealthy" → aggregate is "unhealthy"
 * - Any "degraded"  → aggregate is "degraded"
 * - All "healthy"   → aggregate is "healthy"
 */
export function aggregateStatus(results: readonly HealthCheckResult[]): HealthStatus {
  if (results.some((r) => r.status === "unhealthy")) return "unhealthy";
  if (results.some((r) => r.status === "degraded")) return "degraded";
  return "healthy";
}

/**
 * Run all registered health checks in parallel and return an aggregate report.
 * Individual check failures are caught and reported as "unhealthy" components.
 */
export async function runHealthChecks(
  checks: readonly HealthCheck[],
): Promise<AggregateHealthReport> {
  const settled = await Promise.all(
    checks.map(async (hc): Promise<HealthCheckResult> => {
      const start = Date.now();
      const result: Result<HealthCheckResult, Error> = await tryAsync(() => hc.check());
      if (result.ok) {
        return result.value;
      }
      return {
        name: hc.name,
        status: "unhealthy",
        message: result.error.message,
        latencyMs: Date.now() - start,
      };
    }),
  );

  return {
    status: aggregateStatus(settled),
    checkedAt: new Date().toISOString(),
    components: settled,
  };
}

/** Convenience factory — wraps a simple async predicate as a HealthCheck. */
export function makeHealthCheck(
  name: string,
  probe: () => Promise<boolean>,
  degradedMessage = "degraded",
  unhealthyMessage = "unhealthy",
): HealthCheck {
  return {
    name,
    async check(): Promise<HealthCheckResult> {
      const start = Date.now();
      const result = await tryAsync(probe);
      const latencyMs = Date.now() - start;

      if (!result.ok) {
        return { name, status: "unhealthy", message: result.error.message, latencyMs };
      }
      if (!result.value) {
        return { name, status: "degraded", message: degradedMessage, latencyMs };
      }
      return { name, status: "healthy", latencyMs };
    },
  };
}

/** A HealthCheck that always reports healthy — useful as a placeholder. */
export class AlwaysHealthyCheck implements HealthCheck {
  constructor(readonly name: string) {}

  async check(): Promise<HealthCheckResult> {
    return { name: this.name, status: "healthy" };
  }
}
