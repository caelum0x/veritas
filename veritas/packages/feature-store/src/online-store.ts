// Online feature store: low-latency in-memory serving of feature values for inference.

import { ok, err, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import { makeFeature } from "./feature.js";
import type { Feature, CreateFeatureInput, FeatureValue } from "./feature.js";
import { makeFeatureSet } from "./feature-set.js";
import type { FeatureSet, CreateFeatureSetInput } from "./feature-set.js";
import type { FeatureStore, FeatureLookupRequest, FeatureLookupResult, FeatureWriteRequest } from "./store.js";
import {
  FeatureStoreError,
  FeatureNotFoundError,
  FeatureSetNotFoundError,
  FeatureAlreadyExistsError,
} from "./errors.js";

/** In-memory online feature store optimised for point-in-time reads at inference time. */
export class InMemoryOnlineStore implements FeatureStore {
  /** featureId -> Feature */
  private readonly features = new Map<string, Feature>();
  /** name -> featureId (uniqueness index) */
  private readonly nameIndex = new Map<string, string>();
  /** featureSetId -> FeatureSet */
  private readonly featureSets = new Map<string, FeatureSet>();
  /** `${featureId}:${entityId}` -> sorted list of FeatureValue by timestamp desc */
  private readonly values = new Map<string, FeatureValue[]>();

  private now(): string {
    return new Date().toISOString();
  }

  async registerFeature(input: CreateFeatureInput): Promise<Result<Feature, FeatureStoreError>> {
    if (this.nameIndex.has(input.name)) {
      return err(new FeatureAlreadyExistsError(input.name));
    }
    const id = newId("feat");
    const feature = makeFeature(id, input, this.now());
    this.features.set(id, feature);
    this.nameIndex.set(input.name, id);
    return ok(feature);
  }

  async getFeature(featureId: string): Promise<Result<Feature, FeatureStoreError>> {
    const feature = this.features.get(featureId);
    if (!feature) return err(new FeatureNotFoundError(featureId));
    return ok(feature);
  }

  async listFeatures(): Promise<Result<ReadonlyArray<Feature>, FeatureStoreError>> {
    return ok(Array.from(this.features.values()));
  }

  async registerFeatureSet(input: CreateFeatureSetInput): Promise<Result<FeatureSet, FeatureStoreError>> {
    const id = newId("fset");
    const featureSet = makeFeatureSet(id, input, this.now());
    this.featureSets.set(id, featureSet);
    return ok(featureSet);
  }

  async getFeatureSet(featureSetId: string): Promise<Result<FeatureSet, FeatureStoreError>> {
    const featureSet = this.featureSets.get(featureSetId);
    if (!featureSet) return err(new FeatureSetNotFoundError(featureSetId));
    return ok(featureSet);
  }

  async writeValues(request: FeatureWriteRequest): Promise<Result<void, FeatureStoreError>> {
    for (const value of request.values) {
      const key = `${value.featureId}:${value.entityId}`;
      const existing = this.values.get(key) ?? [];
      // Insert in sorted order (descending by timestamp) and deduplicate same timestamp
      const filtered = existing.filter((v) => v.timestamp !== value.timestamp);
      const merged = [...filtered, value].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      this.values.set(key, merged);
    }
    return ok(undefined);
  }

  async readValues(request: FeatureLookupRequest): Promise<Result<FeatureLookupResult, FeatureStoreError>> {
    const asOf = request.asOf ?? this.now();
    const result = new Map<string, Map<string, FeatureValue>>();

    for (const entityId of request.entityIds) {
      const entityMap = new Map<string, FeatureValue>();
      for (const featureId of request.featureIds) {
        const key = `${featureId}:${entityId}`;
        const history = this.values.get(key) ?? [];
        // Find the latest value at or before asOf
        const match = history.find((v) => v.timestamp <= asOf);
        if (match !== undefined) {
          entityMap.set(featureId, match);
        }
      }
      result.set(entityId, entityMap);
    }

    return ok(result as FeatureLookupResult);
  }
}
