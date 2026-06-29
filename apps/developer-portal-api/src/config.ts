// Zod-validated application configuration with loadConfig() factory.
import { z } from "zod";

const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3010),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "staging", "production", "test"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  jwtSecret: z.string().min(32).default("developer-portal-api-jwt-secret-placeholder-32chars"),
  corsOrigins: z.string().default("*"),
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  rateLimitMax: z.coerce.number().int().positive().default(100),
  requestTimeoutMs: z.coerce.number().int().positive().default(30_000),
  idempotencyTtlMs: z.coerce.number().int().positive().default(86_400_000),
  analyticsMaxEvents: z.coerce.number().int().positive().default(500_000),
  collectorMaxBuffer: z.coerce.number().int().positive().default(10_000),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const raw = {
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    jwtSecret: process.env["JWT_SECRET"],
    corsOrigins: process.env["CORS_ORIGINS"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMax: process.env["RATE_LIMIT_MAX"],
    requestTimeoutMs: process.env["REQUEST_TIMEOUT_MS"],
    idempotencyTtlMs: process.env["IDEMPOTENCY_TTL_MS"],
    analyticsMaxEvents: process.env["ANALYTICS_MAX_EVENTS"],
    collectorMaxBuffer: process.env["COLLECTOR_MAX_BUFFER"],
  };

  const result = AppConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid configuration: ${issues}`);
  }
  return result.data;
}

/** @deprecated use loadConfig() */
export { loadConfig as loadPortalApiConfig };
export type { AppConfig as PortalApiConfig };
