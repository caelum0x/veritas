// Immutable time series: named sequence of chronologically ordered data points.
import { z } from "zod";
import { type DataPoint, comparePoints } from "./point.js";

export const TimeSeriesMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
  labels: z.record(z.string()).optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type TimeSeriesMeta = Readonly<z.infer<typeof TimeSeriesMetaSchema>>;

export interface TimeSeries {
  readonly meta: TimeSeriesMeta;
  /** Points sorted ascending by timestamp (ts field on DataPoint). */
  readonly points: readonly DataPoint[];
}

export function makeSeries(
  meta: TimeSeriesMeta,
  points: readonly DataPoint[] = []
): TimeSeries {
  const sorted = [...points].sort(comparePoints);
  return Object.freeze({ meta: Object.freeze(meta), points: Object.freeze(sorted) });
}

export function appendPoints(
  series: TimeSeries,
  incoming: readonly DataPoint[],
  nowMs: number
): TimeSeries {
  const merged = [...series.points, ...incoming].sort(comparePoints);
  const updatedMeta: TimeSeriesMeta = Object.freeze({
    ...series.meta,
    updatedAt: nowMs,
  });
  return Object.freeze({ meta: updatedMeta, points: Object.freeze(merged) });
}

export function sliceByRange(
  series: TimeSeries,
  from: number,
  to: number
): readonly DataPoint[] {
  return series.points.filter((p) => p.timestamp >= from && p.timestamp <= to);
}

export function seriesSize(series: TimeSeries): number {
  return series.points.length;
}
