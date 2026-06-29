// Persistence / database configuration section
import { z } from "zod";

export const PoolConfigSchema = z.object({
  /** Minimum number of idle connections in the pool */
  min: z.number().int().min(0).default(2),
  /** Maximum number of connections in the pool */
  max: z.number().int().positive().default(20),
  /** Milliseconds a client may sit idle before being released */
  idleTimeoutMs: z.number().int().nonnegative().default(30_000),
  /** Milliseconds to wait when acquiring a connection before erroring */
  acquireTimeoutMs: z.number().int().positive().default(10_000),
  /** Milliseconds between keep-alive pings to idle connections */
  keepAliveMs: z.number().int().positive().default(60_000),
});

export const DatabaseConfigSchema = z.object({
  /** Full PostgreSQL connection URL (postgres://user:pass@host:port/db) */
  url: z.string().url(),
  /** Read-replica URL for SELECT-only queries (falls back to primary if absent) */
  replicaUrl: z.string().url().optional(),
  /** Connection pool settings */
  pool: PoolConfigSchema.default({}),
  /** Statement timeout in milliseconds (0 = disabled) */
  statementTimeoutMs: z.number().int().nonnegative().default(30_000),
  /** Whether to log all SQL queries (verbose, do not enable in production) */
  logQueries: z.boolean().default(false),
  /** SSL mode for the database connection */
  ssl: z.enum(["disable", "require", "verify-ca", "verify-full"]).default("require"),
  /** Path to CA certificate file for SSL verification (optional) */
  sslCaPath: z.string().optional(),
  /** Whether to run pending migrations on startup */
  runMigrationsOnStart: z.boolean().default(false),
  /** Redis URL for caching / queues (redis://host:port) */
  redisUrl: z.string().url().optional(),
});

export type PoolConfig = z.infer<typeof PoolConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export const databaseDefaults: Partial<DatabaseConfig> = {
  ssl: "require",
  logQueries: false,
  statementTimeoutMs: 30_000,
  runMigrationsOnStart: false,
};
