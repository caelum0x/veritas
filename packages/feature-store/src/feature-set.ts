// Feature set: named collection of features that share an entity type and lifecycle.

import { z } from "zod";

/** Immutable descriptor grouping related features under a named entity type. */
export interface FeatureSet {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly entityType: string;
  readonly featureIds: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Zod schema for FeatureSet. */
export const featureSetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  entityType: z.string().min(1),
  featureIds: z.array(z.string()),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Input for creating a new FeatureSet. */
export interface CreateFeatureSetInput {
  readonly name: string;
  readonly description: string;
  readonly entityType: string;
  readonly featureIds?: ReadonlyArray<string>;
  readonly tags?: ReadonlyArray<string>;
}

/** Schema for CreateFeatureSetInput. */
export const createFeatureSetInputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  entityType: z.string().min(1),
  featureIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

/** Returns a new FeatureSet with the given feature id appended. */
export function addFeatureToSet(set: FeatureSet, featureId: string, now: string): FeatureSet {
  if (set.featureIds.includes(featureId)) return set;
  return Object.freeze({
    ...set,
    featureIds: Object.freeze([...set.featureIds, featureId]),
    updatedAt: now,
  });
}

/** Returns a new FeatureSet with the given feature id removed. */
export function removeFeatureFromSet(set: FeatureSet, featureId: string, now: string): FeatureSet {
  return Object.freeze({
    ...set,
    featureIds: Object.freeze(set.featureIds.filter((id) => id !== featureId)),
    updatedAt: now,
  });
}

/** Factory to build a FeatureSet from input and a generated id. */
export function makeFeatureSet(id: string, input: CreateFeatureSetInput, now: string): FeatureSet {
  return Object.freeze({
    id,
    name: input.name,
    description: input.description,
    entityType: input.entityType,
    featureIds: Object.freeze([...(input.featureIds ?? [])]),
    tags: Object.freeze([...(input.tags ?? [])]),
    createdAt: now,
    updatedAt: now,
  });
}
