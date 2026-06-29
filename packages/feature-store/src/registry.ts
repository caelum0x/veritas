// Feature registry: central catalog for feature and feature-set descriptors with in-memory implementation.

import { ok, err, type Result } from "@veritas/core";
import { newId } from "@veritas/core";
import { type Feature, type CreateFeatureInput, makeFeature } from "./feature.js";
import { type FeatureSet, type CreateFeatureSetInput, makeFeatureSet } from "./feature-set.js";
import { FeatureNotFoundError, FeatureSetNotFoundError, FeatureAlreadyExistsError } from "./errors.js";
import { type FeatureStoreError } from "./errors.js";

/** Port interface for the feature registry. */
export interface FeatureRegistry {
  registerFeature(input: CreateFeatureInput): Promise<Result<Feature, FeatureStoreError>>;
  getFeature(id: string): Promise<Result<Feature, FeatureStoreError>>;
  listFeatures(): Promise<Result<ReadonlyArray<Feature>, FeatureStoreError>>;
  findFeatureByName(name: string): Promise<Result<Feature | undefined, FeatureStoreError>>;

  registerFeatureSet(input: CreateFeatureSetInput): Promise<Result<FeatureSet, FeatureStoreError>>;
  getFeatureSet(id: string): Promise<Result<FeatureSet, FeatureStoreError>>;
  listFeatureSets(): Promise<Result<ReadonlyArray<FeatureSet>, FeatureStoreError>>;
  updateFeatureSet(set: FeatureSet): Promise<Result<FeatureSet, FeatureStoreError>>;
}

/** In-memory implementation of FeatureRegistry for development and testing. */
export class InMemoryFeatureRegistry implements FeatureRegistry {
  private readonly features = new Map<string, Feature>();
  private readonly featuresByName = new Map<string, string>();
  private readonly featureSets = new Map<string, FeatureSet>();

  async registerFeature(input: CreateFeatureInput): Promise<Result<Feature, FeatureStoreError>> {
    if (this.featuresByName.has(input.name)) {
      return err(new FeatureAlreadyExistsError(input.name));
    }
    const id = newId("feature");
    const now = new Date().toISOString();
    const feature = makeFeature(id, input, now);
    this.features.set(id, feature);
    this.featuresByName.set(input.name, id);
    return ok(feature);
  }

  async getFeature(id: string): Promise<Result<Feature, FeatureStoreError>> {
    const feature = this.features.get(id);
    if (feature === undefined) return err(new FeatureNotFoundError(id));
    return ok(feature);
  }

  async listFeatures(): Promise<Result<ReadonlyArray<Feature>, FeatureStoreError>> {
    return ok(Object.freeze([...this.features.values()]));
  }

  async findFeatureByName(name: string): Promise<Result<Feature | undefined, FeatureStoreError>> {
    const id = this.featuresByName.get(name);
    if (id === undefined) return ok(undefined);
    return this.getFeature(id);
  }

  async registerFeatureSet(input: CreateFeatureSetInput): Promise<Result<FeatureSet, FeatureStoreError>> {
    const id = newId("fset");
    const now = new Date().toISOString();
    const featureSet = makeFeatureSet(id, input, now);
    this.featureSets.set(id, featureSet);
    return ok(featureSet);
  }

  async getFeatureSet(id: string): Promise<Result<FeatureSet, FeatureStoreError>> {
    const set = this.featureSets.get(id);
    if (set === undefined) return err(new FeatureSetNotFoundError(id));
    return ok(set);
  }

  async listFeatureSets(): Promise<Result<ReadonlyArray<FeatureSet>, FeatureStoreError>> {
    return ok(Object.freeze([...this.featureSets.values()]));
  }

  async updateFeatureSet(set: FeatureSet): Promise<Result<FeatureSet, FeatureStoreError>> {
    if (!this.featureSets.has(set.id)) return err(new FeatureSetNotFoundError(set.id));
    this.featureSets.set(set.id, set);
    return ok(set);
  }
}
