// Range query over a timeseries store with filtering, aggregation, and downsampling
import { ok, err, type Result } from "@veritas/core";
import { type DataPoint, makePoint } from "./point.js";
import type { TimeseriesStore } from "./store.js";
import { getAggregationFn, type AggregationName } from "./aggregate.js";
import { interpolate, type InterpolationStrategy } from "./interpolate.js";
import { InvalidTimeRangeError, TimeseriesNotFoundError } from "./errors.js";

export interface RangeQueryOptions {
  readonly seriesId: string;
  readonly fromMs: number;
  readonly toMs: number;
  readonly bucketMs?: number;
  readonly aggregation?: AggregationName;
  readonly interpolation?: InterpolationStrategy;
  readonly limit?: number;
}

export interface QueryResult {
  readonly seriesId: string;
  readonly points: readonly DataPoint[];
  readonly meta: { readonly total: number; readonly truncated: boolean };
}

function bucketPoints(
  points: readonly DataPoint[],
  bucketMs: number,
  aggFn: (pts: readonly DataPoint[]) => number,
): readonly DataPoint[] {
  const buckets = new Map<number, DataPoint[]>();
  for (const p of points) {
    const bucket = Math.floor(p.timestamp / bucketMs) * bucketMs;
    const existing = buckets.get(bucket);
    if (existing) {
      existing.push(p);
    } else {
      buckets.set(bucket, [p]);
    }
  }
  const result: DataPoint[] = [];
  for (const [bucketTs, bucketPts] of buckets) {
    result.push(makePoint(bucketTs, aggFn(bucketPts)));
  }
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

export function queryRange(
  store: TimeseriesStore,
  options: RangeQueryOptions,
): Result<QueryResult, InvalidTimeRangeError | TimeseriesNotFoundError> {
  const { seriesId, fromMs, toMs, bucketMs, aggregation, interpolation, limit } = options;

  if (fromMs > toMs) {
    return err(new InvalidTimeRangeError(fromMs, toMs));
  }

  const seriesResult = store.get(seriesId);
  if (!seriesResult.ok) {
    return err(new TimeseriesNotFoundError(seriesId));
  }

  let points: readonly DataPoint[] = seriesResult.value.points.filter(
    (p: DataPoint) => p.timestamp >= fromMs && p.timestamp <= toMs,
  );

  if (interpolation && interpolation !== "none" && bucketMs) {
    points = interpolate(points, bucketMs, interpolation);
  }

  if (bucketMs && bucketMs > 0) {
    const aggFn = getAggregationFn(aggregation ?? "mean");
    points = bucketPoints(points, bucketMs, aggFn);
  }

  const total = points.length;
  const truncated = limit !== undefined && total > limit;
  if (truncated && limit !== undefined) {
    points = points.slice(0, limit);
  }

  return ok({ seriesId, points, meta: { total, truncated } });
}

export function queryMulti(
  store: TimeseriesStore,
  seriesIds: readonly string[],
  fromMs: number,
  toMs: number,
): Result<ReadonlyMap<string, readonly DataPoint[]>, InvalidTimeRangeError> {
  if (fromMs > toMs) {
    return err(new InvalidTimeRangeError(fromMs, toMs));
  }

  const result = new Map<string, readonly DataPoint[]>();
  for (const id of seriesIds) {
    const seriesResult = store.get(id);
    if (!seriesResult.ok) continue;
    result.set(
      id,
      seriesResult.value.points.filter((p: DataPoint) => p.timestamp >= fromMs && p.timestamp <= toMs),
    );
  }
  return ok(result);
}
