// Aggregation rules: how metric values are combined across rows and time windows.
import { z } from "zod";
import type { AggFn } from "@veritas/query-engine";
import type { MetricRow, MetricScalar } from "./types.js";

/** Aggregation window: rolling window expressed in number of grain units. */
export const AggregationWindowSchema = z.object({
  /** Size of the window in grain units (e.g. 7 for a 7-day rolling window). */
  size: z.number().int().min(1),
  /** Whether to use a trailing (lookback) window instead of a fixed period. */
  trailing: z.boolean().default(true),
});
export type AggregationWindow = z.infer<typeof AggregationWindowSchema>;

/** How null values should be treated during aggregation. */
export type NullHandling = "ignore" | "zero" | "propagate";
export const NullHandlingSchema = z.enum(["ignore", "zero", "propagate"]);

/** Fill strategy for missing time buckets. */
export type FillStrategy = "none" | "zero" | "forward_fill" | "interpolate";
export const FillStrategySchema = z.enum(["none", "zero", "forward_fill", "interpolate"]);

/** A complete aggregation rule attached to a metric. */
export const AggregationRuleSchema = z.object({
  /** Underlying SQL aggregation function. */
  fn: z.enum(["sum", "count", "avg", "min", "max", "count_distinct"]),
  /** Column to aggregate; undefined means count(*). */
  column: z.string().optional(),
  /** Optional rolling window. When absent the full period is aggregated. */
  window: AggregationWindowSchema.optional(),
  nullHandling: NullHandlingSchema.default("ignore"),
  fillStrategy: FillStrategySchema.default("none"),
  /** Filter expression applied before aggregation (raw SQL fragment). */
  preFilter: z.string().optional(),
});
export type AggregationRule = z.infer<typeof AggregationRuleSchema>;

/** Aggregate a set of numeric values using the specified function. */
export function applyAggFn(
  fn: AggFn,
  values: readonly MetricScalar[]
): number {
  const nums = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  switch (fn) {
    case "count":
      return values.length;
    case "count_distinct":
      return new Set(values).size;
    case "sum":
      return nums.reduce((acc, n) => acc + n, 0);
    case "avg":
      return nums.length === 0 ? 0 : nums.reduce((acc, n) => acc + n, 0) / nums.length;
    case "min":
      return nums.length === 0 ? 0 : Math.min(...nums);
    case "max":
      return nums.length === 0 ? 0 : Math.max(...nums);
  }
}

/** Group rows by a set of dimension columns and aggregate the value column. */
export function groupAndAggregate(
  rows: readonly MetricRow[],
  groupByColumns: readonly string[],
  valueColumn: string,
  fn: AggFn
): readonly MetricRow[] {
  const buckets = new Map<string, MetricScalar[]>();
  const keyData = new Map<string, MetricRow>();

  for (const row of rows) {
    const keyParts = groupByColumns.map((col) => String(row[col] ?? "__null__"));
    const key = keyParts.join("|");
    if (!buckets.has(key)) {
      buckets.set(key, []);
      const keyRow: Record<string, MetricScalar> = {};
      for (const col of groupByColumns) {
        keyRow[col] = row[col] ?? null;
      }
      keyData.set(key, keyRow);
    }
    buckets.get(key)!.push(row[valueColumn] ?? null);
  }

  const result: MetricRow[] = [];
  for (const [key, values] of buckets) {
    const base = keyData.get(key) ?? {};
    result.push({ ...base, [valueColumn]: applyAggFn(fn, values) });
  }
  return result;
}

/** Apply null handling to a list of values before aggregation. */
export function applyNullHandling(
  values: readonly MetricScalar[],
  strategy: NullHandling
): readonly MetricScalar[] {
  switch (strategy) {
    case "ignore":
      return values.filter((v) => v !== null);
    case "zero":
      return values.map((v) => (v === null ? 0 : v));
    case "propagate":
      return values.some((v) => v === null) ? [null] : values;
  }
}
