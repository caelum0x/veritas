// Trust-score trend computation over sliding time windows
import type { IsoTimestamp } from "@veritas/core";
import type { AnalyticsEvent } from "./event.js";

export interface TrustDataPoint {
  readonly timestamp: IsoTimestamp;
  readonly averageScore: number;
  readonly sampleCount: number;
  readonly minScore: number;
  readonly maxScore: number;
}

export interface TrustTrendSeries {
  readonly organizationId: string;
  readonly windowDays: number;
  readonly points: readonly TrustDataPoint[];
  readonly overallTrend: "improving" | "declining" | "stable";
  readonly trendSlope: number;
}

export interface TrustTrendOptions {
  readonly organizationId: string;
  readonly windowDays: number;
  readonly bucketHours: number;
}

function computeSlope(points: readonly TrustDataPoint[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.averageScore);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i]!, 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function classifyTrend(slope: number): "improving" | "declining" | "stable" {
  if (slope > 0.005) return "improving";
  if (slope < -0.005) return "declining";
  return "stable";
}

export function computeTrustTrends(
  events: readonly AnalyticsEvent[],
  options: TrustTrendOptions
): TrustTrendSeries {
  const { organizationId, windowDays, bucketHours } = options;
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const bucketMs = bucketHours * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  const relevant = events.filter(
    (e) =>
      e.organizationId === organizationId &&
      e.type === "verification.completed" &&
      new Date(e.occurredAt).getTime() >= cutoff &&
      typeof (e.properties as Record<string, unknown>)["trustScore"] === "number"
  );

  const buckets = new Map<number, number[]>();
  for (const e of relevant) {
    const ts = new Date(e.occurredAt).getTime();
    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    const score = (e.properties as Record<string, unknown>)["trustScore"] as number;
    const existing = buckets.get(bucket) ?? [];
    buckets.set(bucket, [...existing, score]);
  }

  const points: TrustDataPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, scores]) => ({
      timestamp: new Date(ts).toISOString() as IsoTimestamp,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      sampleCount: scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
    }));

  const slope = computeSlope(points);
  return {
    organizationId,
    windowDays,
    points,
    overallTrend: classifyTrend(slope),
    trendSlope: slope,
  };
}
