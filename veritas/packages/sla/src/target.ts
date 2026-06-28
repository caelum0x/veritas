// SLA targets: define measurable commitments (e.g. uptime %, latency P99).
import { z } from "zod";
import { newId } from "@veritas/core";

export const TargetMetricKindSchema = z.enum([
  "uptime",
  "latency_p50",
  "latency_p95",
  "latency_p99",
  "error_rate",
  "throughput",
  "availability",
  "custom",
]);
export type TargetMetricKind = z.infer<typeof TargetMetricKindSchema>;

export const TargetThresholdSchema = z.object({
  operator: z.enum(["gte", "lte", "gt", "lt", "eq"]),
  value: z.number(),
  unit: z.string().optional(),
});
export type TargetThreshold = z.infer<typeof TargetThresholdSchema>;

export const SlaTargetSchema = z.object({
  id: z.string(),
  slaId: z.string(),
  name: z.string().min(1),
  metricKind: TargetMetricKindSchema,
  threshold: TargetThresholdSchema,
  windowSeconds: z.number().int().positive(),
  weight: z.number().min(0).max(1).default(1),
  enabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SlaTarget = z.infer<typeof SlaTargetSchema>;

export const CreateSlaTargetSchema = SlaTargetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSlaTarget = z.infer<typeof CreateSlaTargetSchema>;

export function makeSlaTarget(input: CreateSlaTarget): SlaTarget {
  const now = new Date().toISOString();
  return {
    ...input,
    id: newId("slat"),
    createdAt: now,
    updatedAt: now,
  };
}

export function meetsThreshold(value: number, threshold: TargetThreshold): boolean {
  switch (threshold.operator) {
    case "gte": return value >= threshold.value;
    case "lte": return value <= threshold.value;
    case "gt":  return value > threshold.value;
    case "lt":  return value < threshold.value;
    case "eq":  return value === threshold.value;
  }
}
