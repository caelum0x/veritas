// Shared types for the experimentation module
import { z } from "zod";
import { Id } from "@veritas/core";

export type ExperimentId = Id<"Experiment">;
export type VariantId = Id<"Variant">;
export type AssignmentId = Id<"Assignment">;
export type ExposureId = Id<"Exposure">;
export type MetricId = Id<"Metric">;
export type GuardrailId = Id<"Guardrail">;

export const ExperimentStatusSchema = z.enum(["draft", "active", "paused", "concluded"]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const VariantTypeSchema = z.enum(["control", "treatment"]);
export type VariantType = z.infer<typeof VariantTypeSchema>;

export const TargetingOperatorSchema = z.enum(["eq", "neq", "in", "nin", "gt", "gte", "lt", "lte", "contains", "not_contains"]);
export type TargetingOperator = z.infer<typeof TargetingOperatorSchema>;

export const TargetingConditionSchema = z.object({
  attribute: z.string().min(1),
  operator: TargetingOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});
export type TargetingCondition = z.infer<typeof TargetingConditionSchema>;

export const TargetingRuleSchema = z.object({
  id: z.string(),
  conditions: z.array(TargetingConditionSchema).min(1),
  combinator: z.enum(["and", "or"]).default("and"),
});
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;

export const TargetingSchema = z.object({
  rules: z.array(TargetingRuleSchema).default([]),
  sampleRate: z.number().min(0).max(1).default(1),
});
export type Targeting = z.infer<typeof TargetingSchema>;

export const VariantSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  key: z.string().min(1),
  type: VariantTypeSchema,
  weight: z.number().min(0).max(1),
  config: z.record(z.unknown()).default({}),
  description: z.string().optional(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const ExperimentSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: ExperimentStatusSchema.default("draft"),
  variants: z.array(VariantSchema).min(2),
  targeting: TargetingSchema.default({ rules: [], sampleRate: 1 }),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export const AssignmentSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  unitId: z.string(),
  variantId: z.string(),
  variantKey: z.string(),
  assignedAt: z.string(),
  context: z.record(z.unknown()).default({}),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const ExposureSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  unitId: z.string(),
  variantId: z.string(),
  variantKey: z.string(),
  exposedAt: z.string(),
  attributes: z.record(z.unknown()).default({}),
});
export type Exposure = z.infer<typeof ExposureSchema>;

export const MetricKindSchema = z.enum(["mean", "proportion", "count", "sum", "p50", "p75", "p95", "p99"]);
export type MetricKind = z.infer<typeof MetricKindSchema>;

export const ExperimentMetricSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  name: z.string().min(1),
  eventName: z.string().min(1),
  kind: MetricKindSchema,
  valueField: z.string().optional(),
  isPrimary: z.boolean().default(false),
  winningDirection: z.enum(["increase", "decrease"]).default("increase"),
});
export type ExperimentMetric = z.infer<typeof ExperimentMetricSchema>;

export const GuardrailSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  metricId: z.string(),
  name: z.string().min(1),
  threshold: z.number(),
  direction: z.enum(["above", "below"]),
  severity: z.enum(["warning", "blocking"]).default("warning"),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export const MetricObservationSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  unitId: z.string(),
  eventName: z.string(),
  value: z.number().optional(),
  observedAt: z.string(),
});
export type MetricObservation = z.infer<typeof MetricObservationSchema>;

export interface UserAttributes {
  readonly [key: string]: string | number | boolean | readonly string[] | readonly number[];
}
