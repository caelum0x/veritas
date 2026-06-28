// Shared value-object types used across the capacity package.
import { z } from "zod";

export const TimeWindowSchema = z.object({
  startIso: z.string(),
  endIso: z.string(),
  granularityMs: z.number().int().positive(),
});
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const MetricSampleSchema = z.object({
  timestampIso: z.string(),
  resourceName: z.string(),
  used: z.number().nonnegative(),
  total: z.number().positive(),
});
export type MetricSample = z.infer<typeof MetricSampleSchema>;

export const UtilizationPointSchema = z.object({
  timestampIso: z.string(),
  resourceName: z.string(),
  ratio: z.number().min(0),
});
export type UtilizationPoint = z.infer<typeof UtilizationPointSchema>;

export const TrendDirectionSchema = z.enum(["increasing", "stable", "decreasing"]);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

export const ScalingActionSchema = z.enum(["scale-up", "scale-down", "no-op"]);
export type ScalingAction = z.infer<typeof ScalingActionSchema>;

export const SaturationStatusSchema = z.enum(["normal", "warning", "critical"]);
export type SaturationStatus = z.infer<typeof SaturationStatusSchema>;

export const SaturationResultSchema = z.object({
  resourceName: z.string(),
  status: SaturationStatusSchema,
  ratio: z.number().min(0),
  trend: TrendDirectionSchema,
  detectedAt: z.string(),
});
export type SaturationResult = z.infer<typeof SaturationResultSchema>;

export const ScalingRecommendationSchema = z.object({
  resourceName: z.string(),
  action: ScalingActionSchema,
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string(),
  suggestedCapacityDelta: z.number(),
  generatedAt: z.string(),
});
export type ScalingRecommendation = z.infer<typeof ScalingRecommendationSchema>;

export const CapacityReportSchema = z.object({
  reportId: z.string(),
  generatedAt: z.string(),
  window: TimeWindowSchema,
  saturation: z.array(SaturationResultSchema),
  recommendations: z.array(ScalingRecommendationSchema),
  summary: z.string(),
});
export type CapacityReport = z.infer<typeof CapacityReportSchema>;
