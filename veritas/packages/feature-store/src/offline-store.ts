// Offline feature store: full historical feature value storage for training data generation.

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

/** Date range for historical scans. */
export interface TimeRange {
  readonly from: string;
  readonly to: string;
}

/** Request for a historical slice of feature values for training. */
export interface HistoricalRequest {
  readonly featureIds: ReadonlyArray<string>;
  readonly entityIds: ReadonlyArray<string>;
  readonly range: TimeRange;
}

/** Ordered list of feature values within the requested time range. */
export type HistoricalResult = ReadonlyArray<FeatureValue>;

/**
 * In-memory offline feature store retaining the full history of all feature values.
 * Supports point-in-time lookups and range scans for training data exports.
 */
export class InMemoryOfflineStore implements FeatureStore {
  private readonly features = new Map<string, Feature>();
  private readonly nameIndex = new Map<string, string>();
  private readonly featureSets = new Map<string, FeatureSet>();
  /** `${featureId}:${entityId}` -> all FeatureValues sorted ascending by timestamp */
  private readonly history = new Map<string, FeatureValue[]>();

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
      const existing = this.history.get(key) ?? [];
      // Append and keep sorted ascending by timestamp; preserve duplicates for audit
      const merged = [...existing, value].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      this.history.set(key, merged);
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
        const entries = this.history.get(key) ?? [];
        // Latest value at or before asOf
        const candidates = entries.filter((v) => v.timestamp <= asOf);
        const match = candidates.at(-1);
        if (match !== undefined) {
          entityMap.set(featureId, match);
        }
      }
      result.set(entityId, entityMap);
    }

    return ok(result as FeatureLookupResult);
  }

  /**
   * Return all feature values for the given features/entities within a time range.
   * Values are returned in ascending timestamp order for reproducible dataset generation.
   */
  async readHistory(request: HistoricalRequest): Promise<Result<HistoricalResult, FeatureStoreError>> {
    const { from, to } = request.range;
    const collected: FeatureValue[] = [];

    for (const entityId of request.entityIds) {
      for (const featureId of request.featureIds) {
        const key = `${featureId}:${entityId}`;
        const entries = this.history.get(key) ?? [];
        const inRange = entries.filter((v) => v.timestamp >= from && v.timestamp <= to);
        collected.push(...inRange);
      }
    }

    // Sort by timestamp ascending, then by featureId for determinism
    collected.sort((a, b) => {
      const tCmp = a.timestamp.localeCompare(b.timestamp);
      return tCmp !== 0 ? tCmp : a.featureId.localeCompare(b.featureId);
    });

    return ok(Object.freeze(collected));
  }
}
