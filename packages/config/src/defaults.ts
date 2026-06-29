// Default config values that do not require environment variables.

import type { RawAppConfig } from "./schema.js";

/**
 * Partial default values for sections whose required fields have env-var fallbacks.
 * Sections with mandatory secrets (croo, anthropic, database, billing) are omitted;
 * those fields must be supplied via environment variables in loadConfig().
 */
export const configDefaults = {
  server: {
    host: "0.0.0.0",
    port: 3000,
    publicUrl: "http://localhost:3000",
    env: "development",
    bodyLimitBytes: 1_048_576,
    keepAliveMs: 5_000,
    trustProxy: false,
    cors: {
      origins: ["*"],
      credentials: false,
      maxAgeSecs: 86_400,
    },
    rateLimit: {
      maxRequests: 200,
      windowMs: 60_000,
      skipAuthenticated: false,
    },
  },
  verification: {
    minConfidenceThreshold: 0.7,
    maxSourcesPerClaim: 10,
    sourceFetchTimeoutMs: 8_000,
    jobTimeoutMs: 120_000,
    fetchConcurrency: 5,
    fetchMaxRetries: 3,
    primarySourceWeight: 1.0,
    secondarySourceWeight: 0.6,
    tertiarySourceWeight: 0.3,
    deduplicateEvidence: true,
    deduplicationThreshold: 0.92,
    maxClaimLength: 2_000,
    enableFetchCache: true,
    fetchCacheTtlSeconds: 3_600,
  },
  observability: {
    logLevel: "info" as const,
    logFormat: "json" as const,
    logSourceLocation: false,
    tracingEnabled: false,
    traceSampleRate: 0.1,
    metricsEnabled: true,
    metricsPath: "/metrics",
    metricsPort: 9090,
    serviceName: "veritas",
    environment: "development",
    slowQueryWarningEnabled: true,
    slowQueryThresholdMs: 500,
    redactSensitiveFields: true,
  },
} satisfies Partial<RawAppConfig>;
