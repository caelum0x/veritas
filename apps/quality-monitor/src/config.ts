// Configuration schema and defaults for the quality-monitor service.

import { z } from "zod";

export const MonitorConfigSchema = z.object({
  /** How often (ms) to collect gate results and recompute trends. */
  collectionIntervalMs: z.number().int().positive().default(60_000),
  /** Number of historical snapshots to retain per gate for trend computation. */
  trendWindowSize: z.number().int().min(2).max(500).default(50),
  /** Severity thresholds that trigger regression alerts. */
  alertFailOn: z.enum(["info", "warning", "error", "critical"]).default("error"),
  /** Minimum score drop (0-1) to count as a trend regression. */
  regressionThreshold: z.number().min(0).max(1).default(0.05),
  /** Maximum number of alerts to retain in memory. */
  maxAlerts: z.number().int().positive().default(500),
  /** Fraction of incoming reports to sample for audit (0–1). */
  sampleRate: z.number().min(0).max(1).default(0.1),
}).readonly();

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

export const DEFAULT_CONFIG: MonitorConfig = MonitorConfigSchema.parse({});
