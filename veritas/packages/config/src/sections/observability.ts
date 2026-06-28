// Logging, metrics, and tracing configuration section.
import { z } from "zod";

export const LogLevelSchema = z.enum(["silent", "error", "warn", "info", "debug", "trace"]);

export type ConfigLogLevel = z.infer<typeof LogLevelSchema>;

export const ObservabilityConfigSchema = z.object({
  /** Minimum log level emitted; messages below this level are suppressed. */
  logLevel: LogLevelSchema.default("info"),
  /** Output format for log lines. "json" for structured logging, "pretty" for human-readable. */
  logFormat: z.enum(["json", "pretty"]).default("json"),
  /** Whether to include caller file/line information in log records. */
  logSourceLocation: z.boolean().default(false),
  /** Whether OpenTelemetry tracing is enabled. */
  tracingEnabled: z.boolean().default(false),
  /** OTLP gRPC endpoint to which traces are exported (e.g. http://localhost:4317). */
  otlpEndpoint: z.string().url().optional(),
  /** Fraction of requests to sample for tracing (0.0–1.0). */
  traceSampleRate: z.number().min(0).max(1).default(0.1),
  /** Whether Prometheus-compatible metrics are enabled. */
  metricsEnabled: z.boolean().default(true),
  /** HTTP path on which the metrics scrape endpoint is exposed. */
  metricsPath: z.string().default("/metrics"),
  /** Port dedicated to the metrics/health HTTP server (separate from the API port). */
  metricsPort: z.number().int().min(1).max(65535).default(9090),
  /** Service name tag attached to all emitted telemetry signals. */
  serviceName: z.string().default("veritas"),
  /** Deployment environment tag attached to telemetry (e.g. production, staging). */
  environment: z.string().default("development"),
  /** Whether to emit slow-query warnings when a DB query exceeds the threshold. */
  slowQueryWarningEnabled: z.boolean().default(true),
  /** Query duration in milliseconds above which a slow-query warning is emitted. */
  slowQueryThresholdMs: z.number().int().positive().default(500),
  /** Whether to redact sensitive fields from log output. */
  redactSensitiveFields: z.boolean().default(true),
});

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;

export const defaultObservabilityConfig: ObservabilityConfig =
  ObservabilityConfigSchema.parse({});
