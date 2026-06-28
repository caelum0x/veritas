// Agent health probe: reports liveness/readiness of the CAP provider process.

import {
  makeHealthCheck,
  runHealthChecks,
  aggregateStatus,
} from "@veritas/observability";
import type { AggregateHealthReport, HealthCheck } from "@veritas/observability";
import type { VeritasProvider } from "@veritas/cap/provider.js";

/** Build a HealthCheck for the CAP provider connection state. */
function makeProviderCheck(provider: VeritasProvider): HealthCheck {
  return makeHealthCheck(
    "cap-provider",
    async (): Promise<boolean> => provider.state === "running",
    "provider is idle or not yet started",
    "provider has stopped or crashed",
  );
}

/** Build a HealthCheck that verifies the process has healthy memory headroom. */
function makeMemoryCheck(): HealthCheck {
  return makeHealthCheck(
    "memory",
    async (): Promise<boolean> => {
      const used = process.memoryUsage().heapUsed;
      const total = process.memoryUsage().heapTotal;
      return used / total < 0.9;
    },
    "heap usage above 90%",
    "heap usage critically high",
  );
}

/** Aggregate health report for the CAP agent, including provider and memory checks. */
export async function getAgentHealth(
  provider: VeritasProvider,
): Promise<AggregateHealthReport> {
  const checks: readonly HealthCheck[] = [
    makeProviderCheck(provider),
    makeMemoryCheck(),
  ];

  return runHealthChecks(checks);
}

/** Returns true when the agent is healthy enough to serve traffic. */
export function isAgentHealthy(report: AggregateHealthReport): boolean {
  return report.status === "healthy" || report.status === "degraded";
}
