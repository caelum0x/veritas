// Measure definitions for OLAP cubes — numeric facts that can be aggregated.
import { z } from "zod";
import { AggregationFnSchema } from "./types.js";

export const MeasureSchema = z.object({
  /** Unique name within the cube. */
  name: z.string().min(1),
  /** Source column in the underlying fact table. */
  column: z.string().min(1),
  /** Aggregation function applied when rolling up. */
  aggregation: AggregationFnSchema,
  /** Human-readable label. */
  label: z.string().min(1),
  /** Optional description for documentation. */
  description: z.string().optional(),
  /** Optional format string (e.g. "#,##0.00", "0%"). */
  format: z.string().optional(),
  /** Whether this measure should be filtered from null rows. */
  filterNulls: z.boolean().default(true),
});

export type Measure = z.infer<typeof MeasureSchema>;

/** Validate and create a Measure. */
export function makeMeasure(input: unknown): Measure {
  return MeasureSchema.parse(input);
}

/** Apply an aggregation function to an array of numeric values. */
export function aggregate(fn: Measure["aggregation"], values: readonly number[]): number | null {
  if (values.length === 0) return null;
  switch (fn) {
    case "sum":
      return values.reduce((acc, v) => acc + v, 0);
    case "count":
      return values.length;
    case "avg": {
      const total = values.reduce((acc, v) => acc + v, 0);
      return total / values.length;
    }
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count_distinct":
      return new Set(values).size;
  }
}

/** Format a raw measure value using an optional format hint. */
export function formatMeasure(value: number | null, measure: Measure): string {
  if (value === null) return "—";
  if (measure.format === "0%") return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString();
}
