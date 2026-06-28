// Defines the core capacity model: resources, tiers, and thresholds for the system.
import { z } from "zod";
import { Brand, brand } from "@veritas/core";

export type ResourceName = Brand<string, "ResourceName">;
export const resourceName = (s: string): ResourceName => brand<string, "ResourceName">(s);

export const ResourceKindSchema = z.enum(["cpu", "memory", "io", "network", "custom"]);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

export const CapacityTierSchema = z.enum(["low", "nominal", "elevated", "critical"]);
export type CapacityTier = z.infer<typeof CapacityTierSchema>;

export const ThresholdSchema = z.object({
  elevated: z.number().min(0).max(1),
  critical: z.number().min(0).max(1),
});
export type Threshold = z.infer<typeof ThresholdSchema>;

export const DEFAULT_THRESHOLD: Threshold = {
  elevated: 0.70,
  critical: 0.90,
};

export const ResourceSchema = z.object({
  name: z.string().transform(resourceName),
  kind: ResourceKindSchema,
  unit: z.string(),
  capacity: z.number().positive(),
  threshold: ThresholdSchema.default(DEFAULT_THRESHOLD),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const CapacityModelSchema = z.object({
  id: z.string(),
  label: z.string(),
  resources: z.array(ResourceSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CapacityModel = z.infer<typeof CapacityModelSchema>;

/** Classify utilisation ratio into a capacity tier. */
export function classifyUtilization(ratio: number, threshold: Threshold): CapacityTier {
  if (ratio >= threshold.critical) return "critical";
  if (ratio >= threshold.elevated) return "elevated";
  if (ratio >= 0) return ratio >= 0.40 ? "nominal" : "low";
  return "low";
}

/** Return true if the model is internally consistent (elevated < critical). */
export function validateModel(model: CapacityModel): boolean {
  return model.resources.every(
    (r) => r.threshold.elevated < r.threshold.critical && r.capacity > 0
  );
}
