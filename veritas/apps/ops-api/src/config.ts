// Zod-validated application configuration with loadConfig() factory.
import { z } from "zod";

const ServerSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(4010),
  host: z.string().default("0.0.0.0"),
  shutdownTimeoutMs: z.coerce.number().int().nonnegative().default(10000),
  basePath: z.string().default("/ops/v1"),
});

const LogSchema = z.object({
  level: z.string().default("info"),
});

const AuthSchema = z.object({
  internalApiSecret: z.string().default("ops-dev-secret-change-me-in-production"),
});

const RateLimitSchema = z.object({
  windowMs: z.coerce.number().int().positive().default(60000),
  maxRequests: z.coerce.number().int().positive().default(300),
});

export const AppConfigSchema = z.object({
  env: z.enum(["development", "test", "production"]).default("development"),
  server: ServerSchema,
  log: LogSchema,
  auth: AuthSchema,
  rateLimit: RateLimitSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    env: process.env["NODE_ENV"],
    server: {
      port: process.env["OPS_API_PORT"] ?? process.env["PORT"],
      host: process.env["OPS_API_HOST"] ?? process.env["HOST"],
      shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
      basePath: process.env["OPS_BASE_PATH"],
    },
    log: {
      level: process.env["LOG_LEVEL"],
    },
    auth: {
      internalApiSecret: process.env["OPS_INTERNAL_API_SECRET"],
    },
    rateLimit: {
      windowMs: process.env["RATE_LIMIT_WINDOW_MS"],
      maxRequests: process.env["RATE_LIMIT_MAX_REQUESTS"],
    },
  });
}
