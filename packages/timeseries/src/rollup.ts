// Rollup: produce a coarser-resolution series from a finer one, accumulating over time.
import { ok, err, type Result } from "@veritas/core";
import { type DataPoint, makePoint } from "./point.js";
import { type AggregationName, getAggregationFn } from "./aggregate.js";
import { RESOLUTION_MS, type Resolution } from "./types.js";
import { InvalidTimeRangeError } from "./errors.js";

export interface RollupConfig {
  readonly sourceResolution: Resolution;
  readonly targetResolution: Resolution;
  readonly aggFn: AggregationName;
}

export interface RollupResult {
  readonly points: readonly DataPoint[];
  readonly sourceCount: number;
  readonly targetCount: number;
  readonly droppedCount: number;
}

/**
 * Roll up `points` from a fine resolution to a coarser one.
 * Returns an error if the target bucket is smaller than the source bucket.
 */
export function rollup(
  points: readonly DataPoint[],
  config: RollupConfig
): Result<RollupResult, InvalidTimeRangeError> {
  const sourceBucketMs = RESOLUTION_MS[config.sourceResolution];
  const targetBucketMs = RESOLUTION_MS[config.targetResolution];

  if (targetBucketMs > 0 && sourceBucketMs > 0 && targetBucketMs < sourceBucketMs) {
    return err(
      new InvalidTimeRangeError(sourceBucketMs, targetBucketMs)
    );
  }

  if (points.length === 0) {
    return ok({ points: [], sourceCount: 0, targetCount: 0, droppedCount: 0 });
  }

  if (targetBucketMs === 0) {
    // raw target — no aggregation needed
    return ok({
      points,
      sourceCount: points.length,
      targetCount: points.length,
      droppedCount: 0,
    });
  }

  const aggFn = getAggregationFn(config.aggFn);
  const buckets = new Map<number, DataPoint[]>();

  for (const point of points) {
    const bucket = Math.floor(point.timestamp / targetBucketMs) * targetBucketMs;
    const existing = buckets.get(bucket);
    if (existing) {
      existing.push(point);
    } else {
      buckets.set(bucket, [point]);
    }
  }

  const rolled: DataPoint[] = [];
  for (const [bucketTs, bucketPoints] of buckets) {
    rolled.push(makePoint(bucketTs, aggFn(bucketPoints)));
  }

  const sorted = rolled.sort((a, b) => a.timestamp - b.timestamp);
  return ok({
    points: sorted,
    sourceCount: points.length,
    targetCount: sorted.length,
    droppedCount: 0,
  });
}

/**
 * Incrementally append a new point to an existing rollup series.
 * Merges `newPoint` into the correct target bucket.
 */
export function rollupAppend(
  existing: readonly DataPoint[],
  newPoint: DataPoint,
  targetResolution: Resolution,
  aggFn: AggregationName
): readonly DataPoint[] {
  const targetBucketMs = RESOLUTION_MS[targetResolution];
  if (targetBucketMs === 0) {
    return [...existing, newPoint].sort((a, b) => a.timestamp - b.timestamp);
  }

  const bucket = Math.floor(newPoint.timestamp / targetBucketMs) * targetBucketMs;
  const aggFnImpl = getAggregationFn(aggFn);

  const bucketPoints = existing.filter((p) => p.timestamp === bucket);
  bucketPoints.push(newPoint);

  const aggregated = makePoint(bucket, aggFnImpl(bucketPoints));
  const withoutBucket = existing.filter((p) => p.timestamp !== bucket);
  return [...withoutBucket, aggregated].sort((a, b) => a.timestamp - b.timestamp);
}
