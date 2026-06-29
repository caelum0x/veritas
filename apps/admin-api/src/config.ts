// Zod-validated AppConfig schema and loadConfig() for the admin-api service.
import { z } from "zod";

const ServerSchema = z.object({
  host: z.string().default("0.0.0.0"),
  port: z.number().int().positive().default(4001),
  trustProxy: z.boolean().default(false),
  bodyLimitBytes: z.number().int().positive().default(1_048_576),
  keepAliveMs: z.number().int().positive().default(65_000),
  cors: z.object({
    origins: z.array(z.string()).default(["*"]),
    credentials: z.boolean().default(false),
    maxAgeSecs: z.number().int().positive().default(86_400),
  }).default({}),
});

const ObservabilitySchema = z.object({
  logLevel: z.string().default("info"),
  metricsEnabled: z.boolean().default(true),
});

const AuthSchema = z.object({
  jwtSecret: z.string().min(16).default("change-me-in-production"),
  adminInternalSecret: z.string().default(""),
  tokenTtlSeconds: z.number().int().positive().default(86_400),
});

const RateLimitSchema = z.object({
  windowMs: z.number().int().positive().default(60_000),
  maxRequests: z.number().int().positive().default(100),
});

export const AppConfigSchema = z.object({
  server: ServerSchema.default({}),
  observability: ObservabilitySchema.default({}),
  auth: AuthSchema.default({}),
  rateLimit: RateLimitSchema.default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Load and validate config from environment variables. */
export function loadConfig(): AppConfig {
  const raw = {
    server: {
      host: process.env["HOST"],
      port: process.env["PORT"] ? Number(process.env["PORT"]) : undefined,
      trustProxy: process.env["TRUST_PROXY"] === "true",
      bodyLimitBytes: process.env["BODY_LIMIT_BYTES"] ? Number(process.env["BODY_LIMIT_BYTES"]) : undefined,
      keepAliveMs: process.env["KEEP_ALIVE_MS"] ? Number(process.env["KEEP_ALIVE_MS"]) : undefined,
      cors: {
        origins: process.env["CORS_ORIGINS"] ? process.env["CORS_ORIGINS"].split(",") : undefined,
        credentials: process.env["CORS_CREDENTIALS"] === "true",
        maxAgeSecs: process.env["CORS_MAX_AGE_SECS"] ? Number(process.env["CORS_MAX_AGE_SECS"]) : undefined,
      },
    },
    observability: {
      logLevel: process.env["LOG_LEVEL"],
      metricsEnabled: process.env["METRICS_ENABLED"] !== "false",
    },
    auth: {
      jwtSecret: process.env["JWT_SECRET"],
      adminInternalSecret: process.env["ADMIN_INTERNAL_SECRET"],
      tokenTtlSeconds: process.env["TOKEN_TTL_SECONDS"] ? Number(process.env["TOKEN_TTL_SECONDS"]) : undefined,
    },
    rateLimit: {
      windowMs: process.env["RATE_LIMIT_WINDOW_MS"] ? Number(process.env["RATE_LIMIT_WINDOW_MS"]) : undefined,
      maxRequests: process.env["RATE_LIMIT_MAX"] ? Number(process.env["RATE_LIMIT_MAX"]) : undefined,
    },
  };

  return AppConfigSchema.parse(raw);
}
