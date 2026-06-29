// Semantic metric definition: a named, typed measure with aggregation semantics.
import { z } from "zod";
import type { AggFn } from "@veritas/query-engine";

export const MetricTypeSchema = z.enum(["count", "sum", "average", "ratio", "gauge", "cumulative"]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

export const MetricUnitSchema = z.enum([
  "none",
  "count",
  "percent",
  "milliseconds",
  "seconds",
  "bytes",
  "kilobytes",
  "megabytes",
  "usd_cents",
  "score",
]);
export type MetricUnit = z.infer<typeof MetricUnitSchema>;

export const MetricSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  type: MetricTypeSchema,
  unit: MetricUnitSchema.default("none"),
  /** Source table in the data warehouse */
  sourceTable: z.string().min(1),
  /** Column to aggregate; omitted for count(*) */
  sourceColumn: z.string().optional(),
  /** Underlying aggregation function */
  aggFn: z.enum(["sum", "count", "avg", "min", "max", "count_distinct"]),
  /** Optional denominator metric id for ratio metrics */
  denominatorMetricId: z.string().optional(),
  /** Human-readable display format hint, e.g. ".2f" */
  format: z.string().default(".2f"),
  tags: z.record(z.string()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Metric = z.infer<typeof MetricSchema>;

export const CreateMetricSchema = MetricSchema.omit({ createdAt: true, updatedAt: true });
export type CreateMetric = z.infer<typeof CreateMetricSchema>;

/** Map metric type to the canonical aggregation function */
export function defaultAggFnForType(type: MetricType): AggFn {
  switch (type) {
    case "count": return "count";
    case "sum": return "sum";
    case "average": return "avg";
    case "ratio": return "sum";
    case "gauge": return "avg";
    case "cumulative": return "sum";
  }
}
