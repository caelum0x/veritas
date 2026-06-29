// Downsample a dense series into fixed-width time buckets using a chosen aggregation.
import { type DataPoint, makePoint } from "./point.js";
import { type AggregationName, getAggregationFn } from "./aggregate.js";
import { RESOLUTION_MS, type Resolution } from "./types.js";

export interface DownsampleOptions {
  readonly resolution: Resolution;
  readonly aggFn: AggregationName;
}

/**
 * Group `points` into time buckets of `bucketMs` width and aggregate each bucket.
 * Returns one synthesised DataPoint per non-empty bucket, sorted ascending.
 */
export function downsample(
  points: readonly DataPoint[],
  options: DownsampleOptions
): readonly DataPoint[] {
  const bucketMs = RESOLUTION_MS[options.resolution];
  if (bucketMs <= 0 || points.length === 0) {
    return points;
  }

  const aggFn = getAggregationFn(options.aggFn);
  const buckets = new Map<number, DataPoint[]>();

  for (const point of points) {
    const bucket = Math.floor(point.timestamp / bucketMs) * bucketMs;
    const existing = buckets.get(bucket);
    if (existing) {
      existing.push(point);
    } else {
      buckets.set(bucket, [point]);
    }
  }

  const result: DataPoint[] = [];
  for (const [bucketTs, bucketPoints] of buckets) {
    const aggregated = aggFn(bucketPoints);
    result.push(makePoint(bucketTs, aggregated));
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Downsample to a target number of points using equal-width buckets over [from, to].
 */
export function downsampleToCount(
  points: readonly DataPoint[],
  targetCount: number,
  from: number,
  to: number,
  aggFn: AggregationName = "mean"
): readonly DataPoint[] {
  if (points.length === 0 || targetCount <= 0) return [];
  if (points.length <= targetCount) return points;

  const span = to - from;
  if (span <= 0) return points;

  const bucketMs = Math.ceil(span / targetCount);
  const aggFnImpl = getAggregationFn(aggFn);
  const buckets = new Map<number, DataPoint[]>();

  for (const point of points) {
    const bucket = Math.floor((point.timestamp - from) / bucketMs) * bucketMs + from;
    const existing = buckets.get(bucket);
    if (existing) {
      existing.push(point);
    } else {
      buckets.set(bucket, [point]);
    }
  }

  const result: DataPoint[] = [];
  for (const [bucketTs, bucketPoints] of buckets) {
    result.push(makePoint(bucketTs, aggFnImpl(bucketPoints)));
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}
