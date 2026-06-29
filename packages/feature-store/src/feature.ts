// Feature definition: typed descriptor for a single ML feature with metadata.

import { z } from "zod";

/** Supported primitive value types for features. */
export type FeatureValueType = "float" | "int" | "string" | "boolean" | "vector";

/** Schema for feature value type. */
export const featureValueTypeSchema = z.enum(["float", "int", "string", "boolean", "vector"]);

/** Immutable feature descriptor defining a named, versioned ML feature. */
export interface Feature {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly valueType: FeatureValueType;
  readonly vectorDim?: number;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Schema for validating a Feature descriptor. */
export const featureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  valueType: featureValueTypeSchema,
  vectorDim: z.number().int().positive().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Input for creating a new feature descriptor. */
export interface CreateFeatureInput {
  readonly name: string;
  readonly description: string;
  readonly valueType: FeatureValueType;
  readonly vectorDim?: number;
  readonly tags?: ReadonlyArray<string>;
}

/** Schema for CreateFeatureInput. */
export const createFeatureInputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  valueType: featureValueTypeSchema,
  vectorDim: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

/** A resolved feature value paired with its feature id and a point-in-time timestamp. */
export interface FeatureValue {
  readonly featureId: string;
  readonly entityId: string;
  readonly value: unknown;
  readonly timestamp: string;
}

/** Schema for FeatureValue. */
export const featureValueSchema = z.object({
  featureId: z.string().min(1),
  entityId: z.string().min(1),
  value: z.unknown(),
  timestamp: z.string(),
});

/** Factory to build a Feature from input and a generated id. */
export function makeFeature(id: string, input: CreateFeatureInput, now: string): Feature {
  return Object.freeze({
    id,
    name: input.name,
    description: input.description,
    valueType: input.valueType,
    vectorDim: input.vectorDim,
    tags: Object.freeze([...(input.tags ?? [])]),
    createdAt: now,
    updatedAt: now,
  });
}
