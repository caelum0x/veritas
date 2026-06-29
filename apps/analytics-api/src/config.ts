// Analytics API configuration — reads server settings from env with safe defaults.
import { z } from "zod";

export const AnalyticsApiConfigSchema = z.object({
  /** TCP port the analytics API listens on. */
  port: z.coerce.number().int().min(1).max(65_535).default(4_010),
  /** Bind address for the HTTP server. */
  host: z.string().min(1).default("0.0.0.0"),
  /** Node environment tag. */
  env: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  /** Log level string. */
  logLevel: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  /** Bearer / API-key header name used by auth middleware. */
  authHeader: z.string().min(1).default("x-api-key"),
  /** Whether the server trusts X-Forwarded-* headers from a reverse proxy. */
  trustProxy: z.coerce.boolean().default(false),
  /** Max incoming JSON body size in bytes. */
  bodyLimitBytes: z.coerce.number().int().positive().default(1_048_576),
  /** Keep-alive timeout in milliseconds for idle HTTP connections. */
  keepAliveMs: z.coerce.number().int().nonnegative().default(5_000),
  /** Graceful shutdown timeout in milliseconds. */
  shutdownTimeoutMs: z.coerce.number().int().positive().default(10_000),
  /** Rate limit: max requests per window per IP. */
  rateLimitMax: z.coerce.number().int().positive().default(200),
  /** Rate limit window in milliseconds. */
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  /** CORS origin header value. */
  corsOrigin: z.string().default("*"),
});

export type AnalyticsApiConfig = z.infer<typeof AnalyticsApiConfigSchema>;

/** Parse analytics API config from process.env, applying defaults for optional values. */
export function loadConfig(): AnalyticsApiConfig {
  const raw: Record<string, string | undefined> = {
    port: process.env["ANALYTICS_API_PORT"] ?? process.env["PORT"],
    host: process.env["ANALYTICS_API_HOST"],
    env: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    authHeader: process.env["AUTH_HEADER"],
    trustProxy: process.env["TRUST_PROXY"],
    bodyLimitBytes: process.env["BODY_LIMIT_BYTES"],
    keepAliveMs: process.env["KEEP_ALIVE_MS"],
    shutdownTimeoutMs: process.env["SHUTDOWN_TIMEOUT_MS"],
    rateLimitMax: process.env["RATE_LIMIT_MAX"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    corsOrigin: process.env["CORS_ORIGIN"],
  };

  const filtered = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  );

  const result = AnalyticsApiConfigSchema.safeParse(filtered);
  if (!result.success) {
    const msgs = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Analytics API config validation failed:\n${msgs}`);
  }
  return result.data;
}
