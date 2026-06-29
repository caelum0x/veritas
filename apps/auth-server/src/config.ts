// Zod-validated application configuration loaded from environment variables.

import { z } from "zod";

const AuthConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(4000),
  host: z.string().min(1).default("0.0.0.0"),
  env: z.enum(["development", "staging", "production", "test"]).default("development"),
  tokenSecret: z.string().min(32),
  tokenTtlSeconds: z.coerce.number().int().positive().default(86400),
  publicUrl: z.string().url().default("http://localhost:4000"),
  corsOrigins: z.string().default("*"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  trustProxy: z.coerce.boolean().default(false),
  bodyLimitBytes: z.coerce.number().int().positive().default(1_048_576),
  keepAliveTimeoutMs: z.coerce.number().int().nonnegative().default(5000),
  rateLimitWindowMs: z.coerce.number().int().positive().default(60000),
  rateLimitMax: z.coerce.number().int().positive().default(100),
  idempotencyTtlMs: z.coerce.number().int().positive().default(86400000),
});

export type AppConfig = z.infer<typeof AuthConfigSchema>;

/** @deprecated Use AppConfig */
export type AuthConfig = AppConfig;

export function loadConfig(): AppConfig {
  return AuthConfigSchema.parse({
    port: process.env["AUTH_PORT"],
    host: process.env["AUTH_HOST"],
    env: process.env["NODE_ENV"],
    tokenSecret: process.env["AUTH_TOKEN_SECRET"] ?? "dev-secret-change-in-production-32ch",
    tokenTtlSeconds: process.env["AUTH_TOKEN_TTL_SECONDS"],
    publicUrl: process.env["AUTH_PUBLIC_URL"],
    corsOrigins: process.env["AUTH_CORS_ORIGINS"],
    logLevel: process.env["LOG_LEVEL"],
    trustProxy: process.env["AUTH_TRUST_PROXY"],
    bodyLimitBytes: process.env["AUTH_BODY_LIMIT_BYTES"],
    keepAliveTimeoutMs: process.env["AUTH_KEEP_ALIVE_TIMEOUT_MS"],
    rateLimitWindowMs: process.env["AUTH_RATE_LIMIT_WINDOW_MS"],
    rateLimitMax: process.env["AUTH_RATE_LIMIT_MAX"],
    idempotencyTtlMs: process.env["AUTH_IDEMPOTENCY_TTL_MS"],
  });
}

/** Alias kept for backwards compat with thin MVP code. */
export const loadAuthConfig = loadConfig;
