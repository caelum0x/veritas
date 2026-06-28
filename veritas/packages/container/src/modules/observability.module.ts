// Registers logger, metrics registry, tracer, and audit logger into the DI container.

import type { Container } from "../container.js";
import type { Token } from "../tokens.js";
import { LOGGER, METRICS } from "../tokens.js";
import {
  createLogger,
  MetricsRegistry,
  globalRegistry,
  noopTracer,
  NoopAuditLogger,
  noopAuditLogger,
  ConsoleAuditLogger,
  parseLogLevel,
  LogLevel,
} from "@veritas/observability";
import type { Logger as ObsLogger, AuditLogger, Tracer } from "@veritas/observability";
import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";

/** Create a local token for observability-layer services not in the global token map. */
function obsToken<T>(name: string): Token<T> {
  return Symbol(name) as Token<T>;
}

/** Local DI tokens for observability services missing from the root token registry. */
export const TRACER_TOKEN             = obsToken<Tracer>("Tracer");
export const AUDIT_LOGGER_TOKEN       = obsToken<AuditLogger>("AuditLogger");
export const OBSERVABILITY_CONFIG_TOKEN = obsToken<Record<string, unknown>>("ObservabilityConfig");

/** Safely resolve an optional dependency — returns null when the token is not registered. */
function tryResolve<T>(c: Container, tok: Token<T>): T | null {
  return c.has(tok) ? c.resolve<T>(tok) : null;
}

/**
 * Wire the observability stack: structured logger, metrics registry, tracer, and audit logger.
 * All registrations gracefully fall back to no-op implementations when config is absent.
 */
export function registerObservabilityModule(container: Container): void {
  // Structured logger — reads level and bindings from ObservabilityConfig when present.
  container.singleton(LOGGER, (c): Logger => {
    const cfg = tryResolve<Record<string, unknown>>(c, OBSERVABILITY_CONFIG_TOKEN);
    const logLevel: LogLevel =
      typeof cfg?.["logLevel"] === "string"
        ? parseLogLevel(cfg["logLevel"] as string)
        : LogLevel.Info;
    const serviceName =
      typeof cfg?.["serviceName"] === "string" ? cfg["serviceName"] : "veritas";
    const environment =
      typeof cfg?.["environment"] === "string" ? cfg["environment"] : "development";

    const logger: ObsLogger = createLogger({
      level: logLevel,
      bindings: { service: serviceName, env: environment },
    });

    // ObsLogger and core Logger share the same interface shape.
    return logger as unknown as Logger;
  });

  // Prometheus-compatible metrics registry — defaults to the singleton globalRegistry.
  container.singleton(METRICS, (c): MetricsRegistry => {
    const cfg = tryResolve<Record<string, unknown>>(c, OBSERVABILITY_CONFIG_TOKEN);
    const enabled = cfg?.["metricsEnabled"] !== false;
    if (!enabled) {
      // Return a fresh isolated registry that won't pollute the global scope.
      return new MetricsRegistry();
    }
    return globalRegistry;
  });

  // Distributed tracer — wires a NoopTracer; production deployments swap in an OTLP exporter.
  container.singleton(TRACER_TOKEN, (c): Tracer => {
    const cfg = tryResolve<Record<string, unknown>>(c, OBSERVABILITY_CONFIG_TOKEN);
    const tracingEnabled = cfg?.["tracingEnabled"] === true;
    if (!tracingEnabled) {
      return noopTracer;
    }
    // When tracing is enabled the real OTLP tracer should be injected by the
    // infrastructure layer; fall back to noop so the container always resolves cleanly.
    return noopTracer;
  });

  // Audit logger — emits structured audit events; uses console in non-production.
  container.singleton(AUDIT_LOGGER_TOKEN, (c): AuditLogger => {
    const cfg = tryResolve<Record<string, unknown>>(c, OBSERVABILITY_CONFIG_TOKEN);
    const environment =
      typeof cfg?.["environment"] === "string" ? cfg["environment"] : "development";
    if (environment === "production" || environment === "staging") {
      return new ConsoleAuditLogger();
    }
    return noopAuditLogger;
  });
}
