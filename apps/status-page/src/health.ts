// Health check aggregation using @veritas/observability runHealthChecks.
import {
  runHealthChecks,
  makeHealthCheck,
  AlwaysHealthyCheck,
  type HealthCheck,
  type AggregateHealthReport,
} from "@veritas/observability";
import type { Deps } from "./container.js";

export { type AggregateHealthReport };

function buildHealthChecks(deps: Deps): readonly HealthCheck[] {
  return [
    new AlwaysHealthyCheck("app"),
    makeHealthCheck(
      "incident-store",
      async () => {
        const result = await deps.incidentService.listIncidents({
          limit: 1,
          offset: 0,
        });
        return result.ok;
      },
    ),
    makeHealthCheck(
      "slo-repository",
      async () => {
        const slos = await deps.sloRepository.findAll();
        return Array.isArray(slos);
      },
    ),
  ];
}

export async function checkHealth(deps: Deps): Promise<AggregateHealthReport> {
  const checks = buildHealthChecks(deps);
  return runHealthChecks(checks);
}

export function isHealthy(report: AggregateHealthReport): boolean {
  return report.status === "healthy";
}
