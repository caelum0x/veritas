// Zod-validated AppConfig and loadConfig() for the domain-router HTTP service.
import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  apiKeyHeader: z.string().default("x-api-key"),
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  rateLimitMax: z.coerce.number().int().positive().default(100),
  verifierName: z.string().default("veritas-domain-router"),
  verifierVersion: z.string().default("1.0.0"),
  verificationConcurrency: z.coerce.number().int().positive().default(4),
  verificationMaxClaims: z.coerce.number().int().positive().default(20),
  verificationMaxSearchQueries: z.coerce.number().int().positive().default(5),
  verificationEffort: z.enum(["low", "standard", "high"]).default("standard"),
  shutdownTimeoutMs: z.coerce.number().int().positive().default(10_000),
  trustedProxies: z.coerce.number().int().nonnegative().default(1),
  classificationConfidenceThreshold: z.coerce.number().min(0).max(1).default(0.6),
  maxVerifiersPerClaim: z.coerce.number().int().positive().default(3),
  enableFallback: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  defaultSignalWeight: z.coerce.number().min(0).max(1).default(0.5),
  verifierTimeoutMs: z.coerce.number().int().positive().default(15_000),
  maxConcurrentVerifiers: z.coerce.number().int().positive().default(4),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Domain-router-specific aliases used by bootstrap/router/plan/dispatch.
export const DomainRouterConfigSchema = AppConfigSchema;
export type DomainRouterConfig = AppConfig;
export const defaultConfig: DomainRouterConfig = AppConfigSchema.parse({});

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    apiKeyHeader: process.env["API_KEY_HEADER"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMax: process.env["RATE_LIMIT_MAX"],
    verifierName: process.env["VERIFIER_NAME"],
    verifierVersion: process.env["VERIFIER_VERSION"],
    verificationConcurrency: process.env["VERIFICATION_CONCURRENCY"],
    verificationMaxClaims: process.env["VERIFICATION_MAX_CLAIMS"],
    verificationMaxSearchQueries: process.env["VERIFICATION_MAX_SEARCH_QUERIES"],
    verificationEffort: process.env["VERIFICATION_EFFORT"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
    trustedProxies: process.env["TRUSTED_PROXIES"],
    classificationConfidenceThreshold: process.env["CLASSIFICATION_CONFIDENCE_THRESHOLD"],
    maxVerifiersPerClaim: process.env["MAX_VERIFIERS_PER_CLAIM"],
    enableFallback: process.env["ENABLE_FALLBACK"],
    defaultSignalWeight: process.env["DEFAULT_SIGNAL_WEIGHT"],
    verifierTimeoutMs: process.env["VERIFIER_TIMEOUT_MS"],
    maxConcurrentVerifiers: process.env["MAX_CONCURRENT_VERIFIERS"],
  });
}
