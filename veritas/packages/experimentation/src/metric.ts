// Experiment metrics: define and aggregate measurements per variant.

import { z } from "zod";
import { newId, type Id, asIsoTimestamp } from "@veritas/core";

export type MetricId = Id<"Metric">;
export const newMetricId = (): MetricId => newId("Metric");

export const MetricTypeSchema = z.enum(["count", "sum", "mean", "ratio", "percentile"]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

export const MetricDirectionSchema = z.enum(["increase", "decrease", "neutral"]);
export type MetricDirection = z.infer<typeof MetricDirectionSchema>;

export const MetricSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  type: MetricTypeSchema,
  direction: MetricDirectionSchema,
  isPrimary: z.boolean().default(false),
  unit: z.string().optional(),
  createdAt: z.string(),
});

export type Metric = z.infer<typeof MetricSchema>;

export const CreateMetricSchema = z.object({
  experimentId: z.string(),
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  type: MetricTypeSchema,
  direction: MetricDirectionSchema,
  isPrimary: z.boolean().optional().default(false),
  unit: z.string().optional(),
});

export type CreateMetric = z.infer<typeof CreateMetricSchema>;

export const MetricObservationSchema = z.object({
  metricId: z.string(),
  variantId: z.string(),
  subjectId: z.string(),
  value: z.number(),
  recordedAt: z.string(),
});

export type MetricObservation = z.infer<typeof MetricObservationSchema>;

export const MetricAggregateSchema = z.object({
  metricId: z.string(),
  variantId: z.string(),
  count: z.number().int().nonnegative(),
  sum: z.number(),
  mean: z.number(),
  variance: z.number(),
  min: z.number(),
  max: z.number(),
});

export type MetricAggregate = z.infer<typeof MetricAggregateSchema>;

export function makeMetric(input: CreateMetric): Metric {
  const now = asIsoTimestamp(new Date().toISOString());
  return {
    id: newMetricId(),
    experimentId: input.experimentId,
    key: input.key,
    name: input.name,
    description: input.description,
    type: input.type,
    direction: input.direction,
    isPrimary: input.isPrimary ?? false,
    unit: input.unit,
    createdAt: now,
  };
}

export function makeObservation(
  metricId: string,
  variantId: string,
  subjectId: string,
  value: number,
): MetricObservation {
  return {
    metricId,
    variantId,
    subjectId,
    value,
    recordedAt: asIsoTimestamp(new Date().toISOString()),
  };
}

export function aggregateObservations(
  metricId: string,
  variantId: string,
  observations: readonly MetricObservation[],
): MetricAggregate {
  const filtered = observations.filter(
    (o) => o.metricId === metricId && o.variantId === variantId,
  );

  if (filtered.length === 0) {
    return { metricId, variantId, count: 0, sum: 0, mean: 0, variance: 0, min: 0, max: 0 };
  }

  const values = filtered.map((o) => o.value);
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (count > 1 ? count - 1 : 1);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { metricId, variantId, count, sum, mean, variance, min, max };
}
