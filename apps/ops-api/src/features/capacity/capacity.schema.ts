// Zod request/response schemas for all capacity feature HTTP boundaries.
import { z } from "zod";
import { MetricSampleSchema, CapacityModelSchema, TimeWindowSchema } from "@veritas/capacity";

export const AddSamplesBodySchema = z.object({
  samples: z.array(MetricSampleSchema).min(1),
});
export type AddSamplesBody = z.infer<typeof AddSamplesBodySchema>;

export const PlanBodySchema = z.object({
  model: CapacityModelSchema,
  windowMs: z.number().int().positive().default(3_600_000),
  forecastHorizonMs: z.number().int().positive().default(1_800_000),
});
export type PlanBody = z.infer<typeof PlanBodySchema>;

export const SaturationQuerySchema = z.object({
  resources: z.string().optional(),
});
export type SaturationQuery = z.infer<typeof SaturationQuerySchema>;

export const ForecastQuerySchema = z.object({
  horizonMs: z.coerce.number().int().positive().default(1_800_000),
  resources: z.string().optional(),
});
export type ForecastQuery = z.infer<typeof ForecastQuerySchema>;

export const RecommendQuerySchema = z.object({
  resources: z.string().optional(),
  forecastHorizonMs: z.coerce.number().int().positive().default(1_800_000),
});
export type RecommendQuery = z.infer<typeof RecommendQuerySchema>;

export const CapacityReportBodySchema = z.object({
  model: CapacityModelSchema,
  window: TimeWindowSchema,
  forecastHorizonMs: z.number().int().positive().default(1_800_000),
});
export type CapacityReportBody = z.infer<typeof CapacityReportBodySchema>;
