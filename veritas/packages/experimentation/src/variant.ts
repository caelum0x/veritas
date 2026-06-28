// Variant definition: experiment arm with weight and configuration payload.

import { z } from "zod";
import { newId, type Id, asIsoTimestamp } from "@veritas/core";

export type VariantId = Id<"Variant">;
export const newVariantId = (): VariantId => newId("Variant");

export const VariantSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  weight: z.number().min(0).max(1),
  isControl: z.boolean().default(false),
  config: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Variant = z.infer<typeof VariantSchema>;

export const CreateVariantSchema = z.object({
  experimentId: z.string(),
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  weight: z.number().min(0).max(1),
  isControl: z.boolean().optional().default(false),
  config: z.record(z.unknown()).optional(),
});

export type CreateVariant = z.infer<typeof CreateVariantSchema>;

export function makeVariant(input: CreateVariant): Variant {
  const now = asIsoTimestamp(new Date().toISOString());
  return {
    id: newVariantId(),
    experimentId: input.experimentId,
    key: input.key,
    name: input.name,
    description: input.description,
    weight: input.weight,
    isControl: input.isControl ?? false,
    config: input.config,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateVariantWeights(variants: readonly Variant[]): boolean {
  if (variants.length === 0) return false;
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  return Math.abs(total - 1.0) < 0.0001;
}

export function getControlVariant(variants: readonly Variant[]): Variant | undefined {
  return variants.find((v) => v.isControl);
}

export function normalizeWeights(variants: readonly Variant[]): readonly Variant[] {
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  if (total === 0) return variants;
  return variants.map((v) => ({ ...v, weight: v.weight / total }));
}
