// Reporting-worker configuration: reads env vars and exposes a typed, validated config.

import { z } from "zod";

const ConfigSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  /** How often (ms) the worker polls for due schedules. */
  pollIntervalMs: z.coerce.number().int().min(1000).default(60_000),

  /** Maximum number of report jobs running concurrently. */
  concurrency: z.coerce.number().int().min(1).max(32).default(4),

  /** Job processing timeout in milliseconds. */
  jobTimeoutMs: z.coerce.number().int().min(5_000).default(300_000),

  /** Maximum retry attempts for a failed job before it is dead-lettered. */
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),

  /** Base delay (ms) for exponential back-off between retries. */
  retryBaseDelayMs: z.coerce.number().int().min(100).default(2_000),

  /** Comma-separated list of organization IDs whose schedules are managed by this worker.
   *  When empty, the worker manages no schedules (suitable for single-tenant dev). */
  organizationIds: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
});

export type ReportingWorkerConfig = z.infer<typeof ConfigSchema>;

/** Load and validate configuration from process.env. Throws on invalid values. */
export function loadConfig(): ReportingWorkerConfig {
  return ConfigSchema.parse({
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    pollIntervalMs: process.env["POLL_INTERVAL_MS"],
    concurrency: process.env["WORKER_CONCURRENCY"],
    jobTimeoutMs: process.env["JOB_TIMEOUT_MS"],
    maxRetries: process.env["MAX_RETRIES"],
    retryBaseDelayMs: process.env["RETRY_BASE_DELAY_MS"],
    organizationIds: process.env["ORGANIZATION_IDS"],
  });
}
