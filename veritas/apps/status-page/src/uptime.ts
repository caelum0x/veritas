// Uptime percentage calculator over a rolling history window.
import { z } from "zod";
import type { HealthHistoryEntry } from "@veritas/health-aggregation";

export const UptimeWindowSchema = z.object({
  label: z.string(),
  durationMs: z.number().int().positive(),
});
export type UptimeWindow = z.infer<typeof UptimeWindowSchema>;

export const UptimeResultSchema = z.object({
  componentId: z.string(),
  windowLabel: z.string(),
  uptimePercent: z.number().min(0).max(100),
  totalSamples: z.number().int().nonnegative(),
  healthySamples: z.number().int().nonnegative(),
});
export type UptimeResult = z.infer<typeof UptimeResultSchema>;

export const DEFAULT_UPTIME_WINDOWS: readonly UptimeWindow[] = Object.freeze([
  { label: "24h", durationMs: 24 * 60 * 60 * 1000 },
  { label: "7d", durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { label: "90d", durationMs: 90 * 24 * 60 * 60 * 1000 },
]);

/** Calculate uptime for a named check over the given history entries and window. */
export function calcUptime(
  componentId: string,
  healthCheckName: string,
  history: readonly HealthHistoryEntry[],
  window: UptimeWindow,
  nowMs: number,
): UptimeResult {
  const cutoffMs = nowMs - window.durationMs;
  const relevant = history.filter(
    (e) => new Date(e.recordedAt).getTime() >= cutoffMs,
  );

  let totalSamples = 0;
  let healthySamples = 0;

  for (const entry of relevant) {
    const check = entry.snapshot.checks.find((c) => c.name === healthCheckName);
    if (check == null) continue;
    totalSamples += 1;
    if (check.status === "healthy") healthySamples += 1;
  }

  const uptimePercent =
    totalSamples === 0 ? 100 : (healthySamples / totalSamples) * 100;

  return Object.freeze({
    componentId,
    windowLabel: window.label,
    uptimePercent: Math.round(uptimePercent * 100) / 100,
    totalSamples,
    healthySamples,
  });
}

/** Compute uptime across all default windows for a single component. */
export function calcUptimeAllWindows(
  componentId: string,
  healthCheckName: string,
  history: readonly HealthHistoryEntry[],
  nowMs: number,
  windows: readonly UptimeWindow[] = DEFAULT_UPTIME_WINDOWS,
): readonly UptimeResult[] {
  return windows.map((w) =>
    calcUptime(componentId, healthCheckName, history, w, nowMs),
  );
}
