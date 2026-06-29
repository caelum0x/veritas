// Feature vector: immutable numeric feature map and utilities for ML model input.

import { isoTimestampSchema } from "@veritas/core";
import { z } from "zod";

/** A single named numeric entry in a feature vector. */
export interface FeatureEntry {
  readonly featureId: string;
  readonly value: number;
}

/** Immutable feature vector passed to ML models for scoring. Features are numeric. */
export interface FeatureVector {
  readonly entityId: string;
  readonly features: Readonly<Record<string, number>>;
  readonly timestamp: string;
}

/** Zod schema for a FeatureEntry. */
export const featureEntrySchema = z.object({
  featureId: z.string().min(1),
  value: z.number(),
});

/** Zod schema for FeatureVector (aligns with types.ts definition). */
export const featureVectorSchema = z.object({
  entityId: z.string().min(1),
  features: z.record(z.string(), z.number()),
  timestamp: isoTimestampSchema,
});

/** Build an immutable FeatureVector from a plain features map. */
export function makeFeatureVector(
  entityId: string,
  features: Readonly<Record<string, number>>,
  timestamp: string,
): FeatureVector {
  return Object.freeze({ entityId, features: Object.freeze({ ...features }), timestamp });
}

/** Retrieve a numeric feature value by featureId, returning undefined if absent. */
export function getNumeric(vector: FeatureVector, featureId: string): number | undefined {
  return vector.features[featureId];
}

/** Convert a FeatureVector to a numeric array ordered by sorted feature names. */
export function toNumericArray(vector: FeatureVector): ReadonlyArray<number> {
  return Object.freeze(
    Object.keys(vector.features)
      .sort()
      .map((k) => vector.features[k] as number),
  );
}

/** Merge two feature vectors for the same entity, with b overriding a on conflicts. */
export function mergeFeatureVectors(a: FeatureVector, b: FeatureVector): FeatureVector {
  return Object.freeze({
    entityId: a.entityId,
    features: Object.freeze({ ...a.features, ...b.features }),
    timestamp: b.timestamp,
  });
}
