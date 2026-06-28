// Zod-validated AppConfig + loadConfig() for billing-api.

import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(4005),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  shutdownTimeoutMs: z.coerce.number().int().min(0).default(10_000),

  // Auth
  jwtSecret: z.string().min(32).default("dev-jwt-secret-must-be-at-least-32-chars!!"),
  apiKeyHashSecret: z.string().min(16).default("dev-api-key-hash-secret"),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().int().min(1000).default(60_000),
  rateLimitMax: z.coerce.number().int().min(1).default(200),

  // Idempotency TTL
  idempotencyTtlMs: z.coerce.number().int().default(86_400_000),

  // Payment processor
  paymentProcessorMode: z.enum(["mock", "usdc-onchain"]).default("mock"),

  // CORS
  corsOrigins: z.string().default("*"),

  // Service identity
  serviceName: z.string().default("billing-api"),
  serviceVersion: z.string().default("1.0.0"),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const raw = {
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
    jwtSecret: process.env["JWT_SECRET"],
    apiKeyHashSecret: process.env["API_KEY_HASH_SECRET"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMax: process.env["RATE_LIMIT_MAX"],
    idempotencyTtlMs: process.env["IDEMPOTENCY_TTL_MS"],
    paymentProcessorMode: process.env["PAYMENT_PROCESSOR_MODE"],
    corsOrigins: process.env["CORS_ORIGINS"],
    serviceName: process.env["SERVICE_NAME"],
    serviceVersion: process.env["SERVICE_VERSION"],
  };

  const result = AppConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid billing-api configuration: ${result.error.message}`);
  }
  return result.data;
}
