// Zod-validated configuration schema and loader for growth-api.
import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3007),
  host: z.string().min(1).default("0.0.0.0"),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  corsOrigins: z.string().default("*"),
  requestTimeoutMs: z.coerce.number().int().positive().default(30000),
  rateLimitWindowMs: z.coerce.number().int().positive().default(60000),
  rateLimitMax: z.coerce.number().int().positive().default(100),
  idempotencyTtlMs: z.coerce.number().int().positive().default(86400000),
  shutdownTimeoutMs: z.coerce.number().int().positive().default(10000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    corsOrigins: process.env["CORS_ORIGINS"],
    requestTimeoutMs: process.env["REQUEST_TIMEOUT_MS"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMax: process.env["RATE_LIMIT_MAX"],
    idempotencyTtlMs: process.env["IDEMPOTENCY_TTL_MS"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
  });
}
