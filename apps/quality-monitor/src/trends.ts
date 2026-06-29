// Compute quality trends from historical gate snapshots.

import { ok, type Result, clampScore, type Score } from "@veritas/core";
import type { GateSnapshot } from "./collector.js";

export interface TrendPoint {
  readonly capturedAt: string;
  readonly passRate: Score;
  readonly avgMetric: number | undefined;
  readonly findingRate: number;
}

export interface GateTrend {
  readonly gateId: string;
  readonly points: readonly TrendPoint[];
  /** Positive = improving, negative = regressing (delta of passRate last vs first). */
  readonly drift: number;
  readonly latestPassRate: Score;
}

/** Group consecutive snapshots into time buckets and compute per-bucket stats. */
function buildPoints(snapshots: readonly GateSnapshot[], bucketSize: number): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (let i = 0; i < snapshots.length; i += bucketSize) {
    const bucket = snapshots.slice(i, i + bucketSize);
    const passed = bucket.filter((s) => s.passed).length;
    const passRate = clampScore(passed / bucket.length);
    const withMetric = bucket.filter((s) => s.metric !== undefined);
    const avgMetric = withMetric.length > 0
      ? withMetric.reduce((sum, s) => sum + (s.metric ?? 0), 0) / withMetric.length
      : undefined;
    const findingRate = bucket.reduce((sum, s) => sum + s.findingCount, 0) / bucket.length;

    points.push({
      capturedAt: bucket[bucket.length - 1]!.capturedAt,
      passRate,
      avgMetric,
      findingRate,
    });
  }

  return points;
}

export function computeGateTrend(
  gateId: string,
  snapshots: readonly GateSnapshot[],
  bucketSize: number = 5,
): Result<GateTrend> {
  if (snapshots.length === 0) {
    const empty: GateTrend = {
      gateId,
      points: [],
      drift: 0,
      latestPassRate: clampScore(0),
    };
    return ok(empty);
  }

  const points = buildPoints(snapshots, Math.max(1, bucketSize));
  const first = points[0]!.passRate;
  const last = points[points.length - 1]!.passRate;
  const drift = last - first;
  const latestPassRate = last;

  return ok({ gateId, points, drift, latestPassRate });
}

export function computeAllTrends(
  allSnapshots: ReadonlyMap<string, readonly GateSnapshot[]>,
  bucketSize: number = 5,
): Result<readonly GateTrend[]> {
  const trends: GateTrend[] = [];

  for (const [gateId, snapshots] of allSnapshots) {
    const r = computeGateTrend(gateId, snapshots, bucketSize);
    if (r.ok) {
      trends.push(r.value);
    }
  }

  return ok(trends);
}
