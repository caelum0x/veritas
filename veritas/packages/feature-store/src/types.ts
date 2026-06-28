// Shared types for the feature-store package: entity keys, lookups, and serving requests/responses.

import { z } from "zod";

/** An entity key identifying a single entity instance (e.g. claim_id, source_id). */
export interface EntityKey {
  readonly entityType: string;
  readonly entityId: string;
}

/** Schema for EntityKey. */
export const entityKeySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

/** A lookup request for online feature serving: entity + desired feature ids. */
export interface FeatureLookupRequest {
  readonly entityKey: EntityKey;
  readonly featureIds: ReadonlyArray<string>;
}

/** Schema for FeatureLookupRequest. */
export const featureLookupRequestSchema = z.object({
  entityKey: entityKeySchema,
  featureIds: z.array(z.string().min(1)).min(1),
});

/** A single resolved feature value in a lookup response. */
export interface ResolvedFeatureValue {
  readonly featureId: string;
  readonly value: unknown;
  readonly timestamp: string;
  readonly isMissing: boolean;
}

/** Schema for ResolvedFeatureValue. */
export const resolvedFeatureValueSchema = z.object({
  featureId: z.string().min(1),
  value: z.unknown(),
  timestamp: z.string(),
  isMissing: z.boolean(),
});

/** Response from an online feature lookup. */
export interface FeatureLookupResponse {
  readonly entityKey: EntityKey;
  readonly features: ReadonlyArray<ResolvedFeatureValue>;
}

/** Schema for FeatureLookupResponse. */
export const featureLookupResponseSchema = z.object({
  entityKey: entityKeySchema,
  features: z.array(resolvedFeatureValueSchema),
});

/** A training row used in offline/batch feature retrieval. */
export interface TrainingRow {
  readonly entityKey: EntityKey;
  readonly timestamp: string;
  readonly features: Readonly<Record<string, unknown>>;
  readonly label?: unknown;
}

/** Schema for TrainingRow. */
export const trainingRowSchema = z.object({
  entityKey: entityKeySchema,
  timestamp: z.string(),
  features: z.record(z.unknown()),
  label: z.unknown().optional(),
});

/** Options controlling offline dataset generation. */
export interface OfflineRetrievalOptions {
  readonly featureSetId: string;
  readonly entityKeys: ReadonlyArray<EntityKey>;
  readonly timestamps: ReadonlyArray<string>;
  readonly labelFeatureId?: string;
}

/** Schema for OfflineRetrievalOptions. */
export const offlineRetrievalOptionsSchema = z.object({
  featureSetId: z.string().min(1),
  entityKeys: z.array(entityKeySchema).min(1),
  timestamps: z.array(z.string()).min(1),
  labelFeatureId: z.string().optional(),
});

/** Materialization status for a feature set batch job. */
export type MaterializationStatus = "pending" | "running" | "succeeded" | "failed";

/** Schema for MaterializationStatus. */
export const materializationStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);

/** Record of a single materialization run. */
export interface MaterializationRun {
  readonly runId: string;
  readonly featureSetId: string;
  readonly status: MaterializationStatus;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly errorMessage?: string;
  readonly rowsWritten: number;
}

/** Schema for MaterializationRun. */
export const materializationRunSchema = z.object({
  runId: z.string().min(1),
  featureSetId: z.string().min(1),
  status: materializationStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  errorMessage: z.string().optional(),
  rowsWritten: z.number().int().min(0),
});
