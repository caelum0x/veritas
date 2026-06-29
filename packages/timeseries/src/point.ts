// Immutable data point: a timestamped numeric value with optional labels.
import { z } from "zod";

export const DataPointSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  value: z.number(),
  labels: z.record(z.string()).optional(),
});

export type DataPoint = Readonly<z.infer<typeof DataPointSchema>>;

export function makePoint(
  timestamp: number,
  value: number,
  labels?: Record<string, string>
): DataPoint {
  return Object.freeze({ timestamp, value, ...(labels ? { labels } : {}) });
}

export function pointAt(timestamp: number, value: number): DataPoint {
  return makePoint(timestamp, value);
}

export function withLabel(
  point: DataPoint,
  key: string,
  val: string
): DataPoint {
  return Object.freeze({
    ...point,
    labels: Object.freeze({ ...point.labels, [key]: val }),
  });
}

export function comparePoints(a: DataPoint, b: DataPoint): number {
  return a.timestamp - b.timestamp;
}
