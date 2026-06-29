// Zod-validated application configuration with environment loading for status-page.
import { z } from "zod";

const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(4090),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  requestTimeoutMs: z.coerce.number().int().positive().default(30000),
  rateLimit: z.object({
    windowMs: z.coerce.number().int().positive().default(60000),
    max: z.coerce.number().int().positive().default(200),
  }).default({}),
  corsOrigin: z.string().default("*"),
  version: z.string().default("1.0.0"),
  serviceName: z.string().default("status-page"),
  refreshIntervalMs: z.coerce.number().int().positive().default(30_000),
  uptimeWindowMs: z.coerce.number().int().positive().default(90 * 24 * 60 * 60 * 1_000),
  maxIncidents: z.coerce.number().int().positive().default(20),
  maxSubscriptions: z.coerce.number().int().positive().default(5_000),
  historyCapacity: z.coerce.number().int().positive().default(2_880),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/** Subset of AppConfig consumed by StatusService. */
export type StatusPageConfig = Pick<AppConfig, "version" | "maxIncidents">;

export function loadConfig(): AppConfig {
  return ConfigSchema.parse({
    port: process.env["STATUS_PAGE_PORT"] ?? process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    requestTimeoutMs: process.env["REQUEST_TIMEOUT_MS"],
    rateLimit: {
      windowMs: process.env["RATE_LIMIT_WINDOW_MS"],
      max: process.env["RATE_LIMIT_MAX"],
    },
    corsOrigin: process.env["CORS_ORIGIN"],
    version: process.env["APP_VERSION"],
    serviceName: process.env["SERVICE_NAME"],
    refreshIntervalMs: process.env["STATUS_REFRESH_MS"],
    uptimeWindowMs: process.env["STATUS_UPTIME_WINDOW_MS"],
    maxIncidents: process.env["STATUS_MAX_INCIDENTS"],
    maxSubscriptions: process.env["STATUS_MAX_SUBSCRIPTIONS"],
    historyCapacity: process.env["STATUS_HISTORY_CAPACITY"],
  });
}
