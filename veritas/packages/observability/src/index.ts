// Public surface of the @veritas/observability package — re-exports all modules.

// Logger
export type { Logger, LogFields } from "./logger.js";
export { ConsoleLogger, noopLogger } from "./logger.js";
export { createLogger } from "./logger-factory.js";
export { LogLevel, isLevelEnabled, parseLogLevel } from "./log-level.js";
export { redactFields, isSensitiveKey } from "./redaction.js";

// Context & correlation
export { runWithContext, getContext, getLogContext, extendContext, type RequestContext } from "./context.js";
export {
  newCorrelationId,
  newRequestId,
  newCorrelationContext,
  extractCorrelationHeaders,
  toCorrelationHeaders,
  type CorrelationContext,
} from "./correlation.js";

// Metrics
export type { Counter, Gauge, Histogram, Labels, Metric, MetricKind, MetricDescriptor, MetricSample } from "./metrics/metric.js";
export { MetricsRegistry, globalRegistry } from "./metrics/registry.js";
export { startTimer, timeAsync, timeSync, createTimer, type Timer } from "./metrics/timers.js";

// Tracing
export type { Span, StartSpanOptions, SpanAttributes, SpanEvent, SpanStatus, Tracer } from "./tracing/span.js";
export { NoopTracer, noopTracer } from "./tracing/noop-tracer.js";

// Audit
export type { AuditEvent, AuditActor, AuditActorType, AuditOutcome } from "./audit/audit-event.js";
export { AuditEventSchema, AuditActorTypeSchema } from "./audit/audit-event.js";
export type { AuditEntry, AuditLogger } from "./audit/audit-logger.js";
export {
  ConsoleAuditLogger,
  InMemoryAuditLogger,
  NoopAuditLogger,
  noopAuditLogger,
} from "./audit/audit-logger.js";

// Health
export type {
  HealthStatus,
  HealthCheckResult,
  HealthCheck,
  AggregateHealthReport,
} from "./health/health-check.js";
export {
  aggregateStatus,
  runHealthChecks,
  makeHealthCheck,
  AlwaysHealthyCheck,
} from "./health/health-check.js";
