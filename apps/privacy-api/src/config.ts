// Zod-validated AppConfig and loadConfig() for the privacy-api HTTP service.

import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3007),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  jwtSecret: z.string().min(16).default("dev-secret-change-in-production-!!"),
  corsOrigins: z.string().default("*"),
  bodyLimitBytes: z.coerce.number().int().positive().default(1_048_576),
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  rateLimitMaxRequests: z.coerce.number().int().positive().default(120),
  shutdownTimeoutMs: z.coerce.number().int().positive().default(10_000),
  requestTimeoutMs: z.coerce.number().int().positive().default(30_000),
  idempotencyTtlMs: z.coerce.number().int().positive().default(86_400_000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    jwtSecret: process.env["JWT_SECRET"],
    corsOrigins: process.env["CORS_ORIGINS"],
    bodyLimitBytes: process.env["BODY_LIMIT_BYTES"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMaxRequests: process.env["RATE_LIMIT_MAX_REQUESTS"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
    requestTimeoutMs: process.env["REQUEST_TIMEOUT_MS"],
    idempotencyTtlMs: process.env["IDEMPOTENCY_TTL_MS"],
  });
}
