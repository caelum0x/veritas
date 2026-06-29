// Measured metrics: time-series data points recorded against SLA targets.
import { z } from "zod";
import { newId } from "@veritas/core";
import { TargetMetricKindSchema } from "./target.js";

export const MetricDataPointSchema = z.object({
  id: z.string(),
  slaId: z.string(),
  targetId: z.string(),
  metricKind: TargetMetricKindSchema,
  value: z.number(),
  unit: z.string().optional(),
  serviceId: z.string(),
  organizationId: z.string(),
  sampledAt: z.string(),
  source: z.string().optional(),
  tags: z.record(z.string()).optional(),
});
export type MetricDataPoint = z.infer<typeof MetricDataPointSchema>;

export const CreateMetricDataPointSchema = MetricDataPointSchema.omit({ id: true });
export type CreateMetricDataPoint = z.infer<typeof CreateMetricDataPointSchema>;

export function makeMetricDataPoint(input: CreateMetricDataPoint): MetricDataPoint {
  return { ...input, id: newId("mdp") };
}

export interface MetricAggregation {
  readonly targetId: string;
  readonly metricKind: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export function aggregateMetrics(
  points: readonly MetricDataPoint[],
  windowStart: string,
  windowEnd: string
): MetricAggregation | null {
  const inWindow = points.filter(
    (p) => p.sampledAt >= windowStart && p.sampledAt <= windowEnd
  );
  if (inWindow.length === 0) return null;

  const values = [...inWindow.map((p) => p.value)].sort((a, b) => a - b);
  const count = values.length;
  const min = values[0]!;
  const max = values[count - 1]!;
  const mean = values.reduce((s, v) => s + v, 0) / count;
  const percentile = (pct: number): number => {
    const idx = Math.min(Math.floor((pct / 100) * count), count - 1);
    return values[idx]!;
  };

  return {
    targetId: inWindow[0]!.targetId,
    metricKind: inWindow[0]!.metricKind,
    windowStart,
    windowEnd,
    count,
    min,
    max,
    mean,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}
