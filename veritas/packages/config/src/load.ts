// loadConfig() — fail-fast loader that builds AppConfig from environment variables.

import { AppConfigSchema } from "./schema.js";
import type { AppConfig } from "./app-config.js";
import { configDefaults } from "./defaults.js";
import { requireEnv, optionalEnv, envInt, envFloat, envBool, envEnum } from "./env.js";

/**
 * Read all configuration from process.env, apply defaults, validate with Zod,
 * and return an immutable AppConfig.  Throws immediately if any required value
 * is missing or fails validation — ensuring the process never starts in a
 * misconfigured state.
 */
export function loadConfig(): AppConfig {
  const raw = buildRaw();
  const result = AppConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${messages}`);
  }
  return result.data;
}

/** Assemble the raw config object from env vars and defaults. */
function buildRaw() {
  return {
    croo: {
      rpcUrl: requireEnv("CROO_RPC_URL"),
      usdcAddress: requireEnv("CROO_USDC_ADDRESS"),
      agentPrivateKey: requireEnv("CROO_AGENT_PRIVATE_KEY"),
      agentId: requireEnv("CROO_AGENT_ID"),
      chainId: envInt("CROO_CHAIN_ID", 8453),
      minSettlementUsdc: envInt("CROO_MIN_SETTLEMENT_USDC", 1_000_000),
      maxSettlementUsdc: envInt("CROO_MAX_SETTLEMENT_USDC", 100_000_000),
      settlementTimeoutMs: envInt("CROO_SETTLEMENT_TIMEOUT_MS", 60_000),
      confirmations: envInt("CROO_CONFIRMATIONS", 2),
      simulate: envBool("CROO_SIMULATE", false),
    },
    anthropic: {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      baseUrl: optionalEnv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
      model: optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
      fastModel: optionalEnv("ANTHROPIC_FAST_MODEL", "claude-haiku-4-5"),
      maxTokens: envInt("ANTHROPIC_MAX_TOKENS", 4096),
      temperature: envFloat("ANTHROPIC_TEMPERATURE", 0.2),
      concurrency: envInt("ANTHROPIC_CONCURRENCY", 5),
      timeoutMs: envInt("ANTHROPIC_TIMEOUT_MS", 120_000),
      maxRetries: envInt("ANTHROPIC_MAX_RETRIES", 3),
      promptCaching: envBool("ANTHROPIC_PROMPT_CACHING", true),
    },
    server: {
      ...configDefaults.server,
      host: optionalEnv("SERVER_HOST", "0.0.0.0"),
      port: envInt("PORT", 3000),
      publicUrl: requireEnv("PUBLIC_URL"),
      env: envEnum(
        "NODE_ENV",
        ["development", "staging", "production", "test"] as const,
        "development"
      ),
      bodyLimitBytes: envInt("SERVER_BODY_LIMIT_BYTES", 1_048_576),
      keepAliveMs: envInt("SERVER_KEEP_ALIVE_MS", 5_000),
      trustProxy: envBool("SERVER_TRUST_PROXY", false),
    },
    database: {
      url: requireEnv("DATABASE_URL"),
      replicaUrl: process.env["DATABASE_REPLICA_URL"] ?? undefined,
      pool: {
        min: envInt("DB_POOL_MIN", 2),
        max: envInt("DB_POOL_MAX", 20),
        idleTimeoutMs: envInt("DB_POOL_IDLE_TIMEOUT_MS", 30_000),
        acquireTimeoutMs: envInt("DB_POOL_ACQUIRE_TIMEOUT_MS", 10_000),
        keepAliveMs: envInt("DB_POOL_KEEP_ALIVE_MS", 60_000),
      },
      statementTimeoutMs: envInt("DB_STATEMENT_TIMEOUT_MS", 30_000),
      logQueries: envBool("DB_LOG_QUERIES", false),
      ssl: envEnum(
        "DB_SSL",
        ["disable", "require", "verify-ca", "verify-full"] as const,
        "require"
      ),
      sslCaPath: process.env["DB_SSL_CA_PATH"] ?? undefined,
      runMigrationsOnStart: envBool("DB_RUN_MIGRATIONS_ON_START", false),
      redisUrl: process.env["REDIS_URL"] ?? undefined,
    },
    billing: {
      stripe: {
        secretKey: requireEnv("STRIPE_SECRET_KEY"),
        publishableKey: requireEnv("STRIPE_PUBLISHABLE_KEY"),
        webhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
        apiVersion: optionalEnv("STRIPE_API_VERSION", "2023-10-16"),
      },
      usage: {
        pricePerVerificationUsdc: envInt("BILLING_PRICE_PER_VERIFICATION_USDC", 500_000),
        pricePer1kCallsUsdc: envInt("BILLING_PRICE_PER_1K_CALLS_USDC", 1_000_000),
        freeMonthlyVerifications: envInt("BILLING_FREE_MONTHLY_VERIFICATIONS", 10),
        gracePeriodMs: envInt("BILLING_GRACE_PERIOD_MS", 7 * 24 * 60 * 60 * 1000),
      },
      currency: optionalEnv("BILLING_CURRENCY", "usd"),
      billingDayOfMonth: envInt("BILLING_DAY_OF_MONTH", 1),
      autoCollect: envBool("BILLING_AUTO_COLLECT", true),
      minimumChargeAmountCents: envInt("BILLING_MINIMUM_CHARGE_AMOUNT_CENTS", 50),
      taxRate: envFloat("BILLING_TAX_RATE", 0),
    },
    verification: configDefaults.verification,
    observability: {
      ...configDefaults.observability,
      logLevel: envEnum(
        "LOG_LEVEL",
        ["silent", "error", "warn", "info", "debug", "trace"] as const,
        "info"
      ),
      logFormat: envEnum("LOG_FORMAT", ["json", "pretty"] as const, "json"),
      logSourceLocation: envBool("LOG_SOURCE_LOCATION", false),
      tracingEnabled: envBool("TRACING_ENABLED", false),
      otlpEndpoint: process.env["OTLP_ENDPOINT"] ?? undefined,
      traceSampleRate: envFloat("TRACE_SAMPLE_RATE", 0.1),
      metricsEnabled: envBool("METRICS_ENABLED", true),
      metricsPath: optionalEnv("METRICS_PATH", "/metrics"),
      metricsPort: envInt("METRICS_PORT", 9090),
      serviceName: optionalEnv("SERVICE_NAME", "veritas"),
      environment: optionalEnv("ENVIRONMENT", "development"),
      slowQueryWarningEnabled: envBool("SLOW_QUERY_WARNING_ENABLED", true),
      slowQueryThresholdMs: envInt("SLOW_QUERY_THRESHOLD_MS", 500),
      redactSensitiveFields: envBool("REDACT_SENSITIVE_FIELDS", true),
    },
  };
}
