// Register health checks for all platform subsystems into the observability registry.
import type { Logger } from "@veritas/core";
import type { HealthCheck } from "@veritas/health-aggregation";
import { makeHealthCheck } from "@veritas/observability";
import type { HealthCheck as ObsHealthCheck } from "@veritas/observability";

/** Subsystem probe function: returns true if healthy, false if degraded, throws if unhealthy. */
export interface SubsystemProbe {
  readonly name: string;
  readonly critical: boolean;
  readonly probe: () => Promise<boolean>;
  readonly degradedMessage?: string;
  readonly unhealthyMessage?: string;
}

/** Registry that accumulates health checks for both observability and aggregation layers. */
export interface CheckRegistry {
  readonly obsChecks: ObsHealthCheck[];
  readonly aggChecks: HealthCheck[];
}

/** Create an empty check registry. */
export function createCheckRegistry(): CheckRegistry {
  return { obsChecks: [], aggChecks: [] };
}

/** Register a subsystem probe into both check registries. */
export function registerSubsystem(
  registry: CheckRegistry,
  sub: SubsystemProbe,
  logger: Logger,
): void {
  logger.info("Registering health check", { name: sub.name, critical: sub.critical });

  const obsCheck = makeHealthCheck(
    sub.name,
    sub.probe,
    sub.degradedMessage,
    sub.unhealthyMessage,
  );
  registry.obsChecks.push(obsCheck);

  const aggCheck: HealthCheck = {
    name: sub.name,
    timeout: 5000,
    async execute() {
      const start = Date.now();
      try {
        const healthy = await sub.probe();
        const latencyMs = Date.now() - start;
        return {
          ok: true,
          value: {
            name: sub.name,
            status: healthy ? ("healthy" as const) : ("degraded" as const),
            latencyMs,
            checkedAt: new Date().toISOString(),
            metadata: { critical: sub.critical },
          },
        };
      } catch (cause) {
        const latencyMs = Date.now() - start;
        return {
          ok: true,
          value: {
            name: sub.name,
            status: "unhealthy" as const,
            latencyMs,
            checkedAt: new Date().toISOString(),
            error: cause instanceof Error ? cause.message : String(cause),
            metadata: { critical: sub.critical },
          },
        };
      }
    },
  };
  registry.aggChecks.push(aggCheck);
}

/** Register a batch of subsystem probes. */
export function registerAll(
  registry: CheckRegistry,
  probes: readonly SubsystemProbe[],
  logger: Logger,
): void {
  for (const sub of probes) {
    registerSubsystem(registry, sub, logger);
  }
}
