// Builds the Deps object wiring @veritas/mock-server registry and @veritas/observability.
import {
  createRegistry,
  type Registry,
} from "@veritas/mock-server";
import {
  createLogger,
  MetricsRegistry,
  AlwaysHealthyCheck,
  type Logger,
  type HealthCheck,
} from "@veritas/observability";
import { systemClock, type Clock } from "@veritas/core";
import type { AppConfig } from "./config.js";

export type Deps = {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly metrics: MetricsRegistry;
  readonly healthChecks: readonly HealthCheck[];
  // Registry is mutable via ref so feature modules share the same mutable cell.
  readonly registryRef: { current: Registry };
};

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "mock-api-server" },
  });

  const clock = systemClock;
  const metrics = new MetricsRegistry();

  const registryRef = { current: createRegistry() };

  const healthChecks: readonly HealthCheck[] = [
    new AlwaysHealthyCheck("mock-registry"),
  ];

  return {
    config,
    logger,
    clock,
    metrics,
    healthChecks,
    registryRef,
  };
}
