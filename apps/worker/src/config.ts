// Worker configuration loaded from environment variables with sensible defaults.
import { z } from "zod";

const WorkerConfigSchema = z.object({
  pollIntervalMs: z.number().int().positive().default(1000),
  concurrency: z.number().int().positive().default(5),
  shutdownGracePeriodMs: z.number().int().positive().default(5000),
  maxJobAgeMs: z.number().int().positive().default(86_400_000), // 24h
  orderExpiryThresholdMs: z.number().int().positive().default(3_600_000), // 1h
  settlementLookbackMs: z.number().int().positive().default(3_600_000), // 1h
  usageAggregationWindowMs: z.number().int().positive().default(3_600_000), // 1h
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

export function loadWorkerConfig(): WorkerConfig {
  return WorkerConfigSchema.parse({
    pollIntervalMs: envInt("WORKER_POLL_INTERVAL_MS", 1000),
    concurrency: envInt("WORKER_CONCURRENCY", 5),
    shutdownGracePeriodMs: envInt("WORKER_SHUTDOWN_GRACE_MS", 5000),
    maxJobAgeMs: envInt("WORKER_MAX_JOB_AGE_MS", 86_400_000),
    orderExpiryThresholdMs: envInt("WORKER_ORDER_EXPIRY_THRESHOLD_MS", 3_600_000),
    settlementLookbackMs: envInt("WORKER_SETTLEMENT_LOOKBACK_MS", 3_600_000),
    usageAggregationWindowMs: envInt("WORKER_USAGE_AGGREGATION_WINDOW_MS", 3_600_000),
  });
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
