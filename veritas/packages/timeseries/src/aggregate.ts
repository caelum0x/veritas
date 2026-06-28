// Aggregation functions for timeseries data points
import type { DataPoint } from "./point.js";

export type AggregationFn = (points: readonly DataPoint[]) => number;

export const sum: AggregationFn = (points) =>
  points.reduce((acc, p) => acc + p.value, 0);

export const count: AggregationFn = (points) => points.length;

export const mean: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  return sum(points) / points.length;
};

export const min: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  return points.reduce((acc, p) => Math.min(acc, p.value), Infinity);
};

export const max: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  return points.reduce((acc, p) => Math.max(acc, p.value), -Infinity);
};

export const last: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  return points[points.length - 1]!.value;
};

export const first: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  return points[0]!.value;
};

export const stddev: AggregationFn = (points) => {
  if (points.length < 2) return 0;
  const avg = mean(points);
  const variance =
    points.reduce((acc, p) => acc + (p.value - avg) ** 2, 0) / points.length;
  return Math.sqrt(variance);
};

export const median: AggregationFn = (points) => {
  if (points.length === 0) return 0;
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1]!.value + sorted[mid]!.value) / 2)
    : sorted[mid]!.value;
};

export type AggregationName =
  | "sum"
  | "count"
  | "mean"
  | "min"
  | "max"
  | "last"
  | "first"
  | "stddev"
  | "median";

const registry: Record<AggregationName, AggregationFn> = {
  sum,
  count,
  mean,
  min,
  max,
  last,
  first,
  stddev,
  median,
};

export function getAggregationFn(name: AggregationName): AggregationFn {
  return registry[name];
}
