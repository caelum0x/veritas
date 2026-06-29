// Zod-validated AppConfig with loadConfig() for the mock-api-server.
import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.number().int().min(1).max(65_535).default(4010),
  host: z.string().min(1).default("0.0.0.0"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  corsOrigins: z.array(z.string()).default(["*"]),
  recordCalls: z.boolean().default(true),
  defaultDelayMs: z.number().int().min(0).default(0),
  adminPrefix: z.string().default("/_mock"),
  shutdownTimeoutMs: z.number().int().min(0).default(10_000),
  rateLimit: z.object({
    windowMs: z.number().int().min(1000).default(60_000),
    max: z.number().int().min(1).default(500),
  }).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Keep backward-compat alias used by existing app.ts/bootstrap.ts
export type MockApiConfig = AppConfig;

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) ? fallback : n;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return raw.toLowerCase() !== "false" && raw !== "0";
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ["*"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function loadConfig(): AppConfig {
  return AppConfigSchema.parse({
    port: parsePort(process.env["MOCK_API_PORT"], 4010),
    host: process.env["MOCK_API_HOST"] ?? "0.0.0.0",
    logLevel: process.env["MOCK_API_LOG_LEVEL"] ?? "info",
    corsOrigins: parseOrigins(process.env["MOCK_API_CORS_ORIGINS"]),
    recordCalls: parseBool(process.env["MOCK_API_RECORD_CALLS"], true),
    defaultDelayMs: parsePort(process.env["MOCK_API_DEFAULT_DELAY_MS"], 0),
    adminPrefix: process.env["MOCK_API_ADMIN_PREFIX"] ?? "/_mock",
    shutdownTimeoutMs: parsePort(process.env["MOCK_API_SHUTDOWN_TIMEOUT_MS"], 10_000),
    rateLimit: {
      windowMs: parsePort(process.env["MOCK_API_RATE_LIMIT_WINDOW_MS"], 60_000),
      max: parsePort(process.env["MOCK_API_RATE_LIMIT_MAX"], 500),
    },
  });
}
