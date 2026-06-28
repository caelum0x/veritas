// Zod-validated AppConfig and loadConfig for the webhook-gateway service.

import { z } from "zod";

const AppConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  port: z.coerce.number().int().min(1).max(65535).default(3006),
  host: z.string().default("0.0.0.0"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),

  // JWT secret for session token verification
  jwtSecret: z.string().min(32),

  // HMAC secret used to sign outgoing webhook payloads
  webhookSigningSecret: z.string().min(8),

  // Organization ID used as the default event routing context
  defaultOrganizationId: z.string().default("org_default"),

  // Inbound signature verification max age
  signatureMaxAgeMs: z.coerce.number().int().positive().default(300_000),

  // Rate limit window / cap
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  rateLimitMaxRequests: z.coerce.number().int().positive().default(200),

  // Graceful shutdown timeout
  shutdownTimeoutMs: z.coerce.number().int().positive().default(10_000),

  // Idempotency key TTL (ms)
  idempotencyWindowMs: z.coerce.number().int().positive().default(86_400_000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    nodeEnv: process.env["NODE_ENV"],
    port: process.env["PORT"],
    host: process.env["HOST"],
    logLevel: process.env["LOG_LEVEL"],
    jwtSecret:
      process.env["JWT_SECRET"] ?? "change-me-at-least-32-chars-in-production",
    webhookSigningSecret:
      process.env["WEBHOOK_SIGNING_SECRET"] ?? "webhook-dev-secret-key",
    defaultOrganizationId: process.env["DEFAULT_ORGANIZATION_ID"],
    signatureMaxAgeMs: process.env["SIGNATURE_MAX_AGE_MS"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMaxRequests: process.env["RATE_LIMIT_MAX_REQUESTS"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
    idempotencyWindowMs: process.env["IDEMPOTENCY_WINDOW_MS"],
  });
}
