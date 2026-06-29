// Dev config — builds an in-memory AppConfig without requiring all production env vars.

import type { AppConfig } from "@veritas/config";

/** Minimal dev config with in-memory/noop defaults — no real credentials needed. */
export function buildDevConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const base: AppConfig = {
    croo: {
      rpcUrl: "http://localhost:8545",
      usdcAddress: "0x0000000000000000000000000000000000000001",
      agentPrivateKey: "0x" + "a".repeat(64),
      agentId: "dev-agent-001",
      chainId: 8453,
      minSettlementUsdc: 1_000_000,
      maxSettlementUsdc: 100_000_000,
      settlementTimeoutMs: 60_000,
      confirmations: 1,
      simulate: true,
    },
    anthropic: {
      apiKey: process.env["ANTHROPIC_API_KEY"] ?? "dev-key",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4-5",
      fastModel: "claude-haiku-4-5",
      maxTokens: 4096,
      temperature: 0.2,
      concurrency: 2,
      timeoutMs: 120_000,
      maxRetries: 2,
      promptCaching: false,
    },
    server: {
      host: "127.0.0.1",
      port: Number(process.env["PORT"] ?? 3000),
      publicUrl: `http://127.0.0.1:${process.env["PORT"] ?? 3000}`,
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
        maxRequests: 1_000,
        windowMs: 60_000,
        skipAuthenticated: false,
      },
    },
    database: {
      url: process.env["DATABASE_URL"] ?? "postgres://localhost:5432/veritas_dev",
      pool: {
        min: 1,
        max: 5,
        idleTimeoutMs: 30_000,
        acquireTimeoutMs: 10_000,
        keepAliveMs: 60_000,
      },
      statementTimeoutMs: 30_000,
      logQueries: false,
      ssl: "disable",
      runMigrationsOnStart: false,
    },
    billing: {
      stripe: {
        secretKey: "sk_test_dev",
        publishableKey: "pk_test_dev",
        webhookSecret: "whsec_dev",
        apiVersion: "2023-10-16",
      },
      usage: {
        pricePerVerificationUsdc: 500_000,
        pricePer1kCallsUsdc: 1_000_000,
        freeMonthlyVerifications: 100,
        gracePeriodMs: 7 * 24 * 60 * 60 * 1000,
      },
      currency: "usd",
      billingDayOfMonth: 1,
      autoCollect: false,
      minimumChargeAmountCents: 50,
      taxRate: 0,
    },
    verification: {
      minConfidenceThreshold: 0.7,
      maxSourcesPerClaim: 10,
      sourceFetchTimeoutMs: 8_000,
      jobTimeoutMs: 120_000,
      fetchConcurrency: 3,
      fetchMaxRetries: 2,
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
      logLevel: "info",
      logFormat: "pretty",
      logSourceLocation: false,
      tracingEnabled: false,
      traceSampleRate: 0,
      metricsEnabled: false,
      metricsPath: "/metrics",
      metricsPort: 9090,
      serviceName: "veritas-all-in-one",
      environment: "development",
      slowQueryWarningEnabled: false,
      slowQueryThresholdMs: 500,
      redactSensitiveFields: false,
    },
  };

  return { ...base, ...overrides } as AppConfig;
}
