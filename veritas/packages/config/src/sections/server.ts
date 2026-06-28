// HTTP server configuration section for the Veritas REST API
import { z } from "zod";

export const CorsConfigSchema = z.object({
  /** Allowed origins (use ["*"] to permit all in development) */
  origins: z.array(z.string()).default(["*"]),
  /** Whether to allow credentials in cross-origin requests */
  credentials: z.boolean().default(false),
  /** Preflight cache max-age in seconds */
  maxAgeSecs: z.number().int().nonnegative().default(86_400),
});

export const RateLimitConfigSchema = z.object({
  /** Maximum requests per window per IP */
  maxRequests: z.number().int().positive().default(200),
  /** Window size in milliseconds */
  windowMs: z.number().int().positive().default(60_000),
  /** Whether to skip rate-limiting for authenticated API-key requests */
  skipAuthenticated: z.boolean().default(false),
});

export const ServerConfigSchema = z.object({
  /** Host/address to bind the HTTP server */
  host: z.string().min(1).default("0.0.0.0"),
  /** TCP port to listen on */
  port: z.number().int().min(1).max(65_535).default(3000),
  /** Public-facing base URL (used in generated links and redirects) */
  publicUrl: z.string().url(),
  /** Node environment tag */
  env: z.enum(["development", "staging", "production", "test"]).default("development"),
  /** Body-parser limit for incoming JSON payloads */
  bodyLimitBytes: z.number().int().positive().default(1_048_576),
  /** Idle keep-alive timeout in milliseconds */
  keepAliveMs: z.number().int().nonnegative().default(5_000),
  /** CORS settings */
  cors: CorsConfigSchema.default({}),
  /** Rate limiting settings */
  rateLimit: RateLimitConfigSchema.default({}),
  /** Whether to trust the X-Forwarded-* headers (set true behind a proxy) */
  trustProxy: z.boolean().default(false),
});

export type CorsConfig = z.infer<typeof CorsConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export const serverDefaults: Partial<ServerConfig> = {
  host: "0.0.0.0",
  port: 3000,
  env: "development",
  bodyLimitBytes: 1_048_576,
  keepAliveMs: 5_000,
  trustProxy: false,
};
