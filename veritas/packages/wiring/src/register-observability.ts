// Registers logger, metrics registry, tracer, and audit logger into a Container.

import { Container, LOGGER, METRICS } from "@veritas/container";
import {
  createLogger,
  parseLogLevel,
  LogLevel,
  MetricsRegistry,
  globalRegistry,
  noopTracer,
  noopAuditLogger,
} from "@veritas/observability";
import { CONFIG } from "@veritas/container";
import type { AppConfig } from "@veritas/config";

/**
 * Wire the observability stack into the provided Container.
 * Reads log level and service metadata from the resolved AppConfig.
 */
export function registerObservability(c: Container): void {
  c.singleton(LOGGER, (container) => {
    const config: AppConfig | undefined = container.has(CONFIG)
      ? container.resolve<AppConfig>(CONFIG)
      : undefined;
    const rawLevel = config?.observability?.logLevel ?? "info";
    const level = parseLogLevel(String(rawLevel));
    const serviceName = config?.observability?.serviceName ?? "veritas";
    const environment = config?.observability?.environment ?? "development";

    return createLogger({
      level,
      bindings: { service: serviceName, env: environment },
    });
  });

  c.singleton(METRICS, (_container) => {
    // Use the global shared registry so all subsystems share metric descriptors.
    return globalRegistry;
  });
}
