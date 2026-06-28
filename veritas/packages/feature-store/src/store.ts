// Feature store port: abstract interface for reading and writing feature values.

import type { Result } from "@veritas/core";
import type { Feature, CreateFeatureInput, FeatureValue } from "./feature.js";
import type { FeatureSet, CreateFeatureSetInput } from "./feature-set.js";
import type { FeatureStoreError } from "./errors.js";

/** Request for a batch of feature values for a set of entity ids. */
export interface FeatureLookupRequest {
  readonly featureIds: ReadonlyArray<string>;
  readonly entityIds: ReadonlyArray<string>;
  /** ISO timestamp for point-in-time lookups; defaults to now. */
  readonly asOf?: string;
}

/** A map from entityId -> featureId -> FeatureValue. */
export type FeatureLookupResult = ReadonlyMap<string, ReadonlyMap<string, FeatureValue>>;

/** Write a set of feature values (upsert semantics). */
export interface FeatureWriteRequest {
  readonly values: ReadonlyArray<FeatureValue>;
}

/** Port interface for a feature store — both online and offline implement this. */
export interface FeatureStore {
  /** Register a new feature descriptor. */
  registerFeature(input: CreateFeatureInput): Promise<Result<Feature, FeatureStoreError>>;

  /** Retrieve a feature descriptor by id. */
  getFeature(featureId: string): Promise<Result<Feature, FeatureStoreError>>;

  /** List all registered features. */
  listFeatures(): Promise<Result<ReadonlyArray<Feature>, FeatureStoreError>>;

  /** Register a feature set. */
  registerFeatureSet(input: CreateFeatureSetInput): Promise<Result<FeatureSet, FeatureStoreError>>;

  /** Retrieve a feature set by id. */
  getFeatureSet(featureSetId: string): Promise<Result<FeatureSet, FeatureStoreError>>;

  /** Write feature values (upsert). */
  writeValues(request: FeatureWriteRequest): Promise<Result<void, FeatureStoreError>>;

  /** Read feature values for entities. */
  readValues(request: FeatureLookupRequest): Promise<Result<FeatureLookupResult, FeatureStoreError>>;
}
