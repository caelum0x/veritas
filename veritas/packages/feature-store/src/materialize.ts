// Materialization: computes and writes all feature values for a feature set from a source record batch.

import { ok, err, type Result } from "@veritas/core";
import { type FeatureValue } from "./feature.js";
import { type FeatureSet } from "./feature-set.js";
import { type FeatureTransform } from "./transform.js";
import { type FeatureStoreError, FeatureStoreError as FSError } from "./errors.js";

/** A raw entity record: entityId plus a map of featureId -> raw value. */
export interface EntityRecord {
  readonly entityId: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

/** Per-feature materialization spec: which transform pipeline to apply. */
export interface FeatureMaterializationSpec {
  readonly featureId: string;
  readonly transform: FeatureTransform;
}

/** Options controlling a materialization run. */
export interface MaterializationOptions {
  readonly featureSet: FeatureSet;
  readonly specs: ReadonlyArray<FeatureMaterializationSpec>;
  readonly records: ReadonlyArray<EntityRecord>;
}

/** Result of a materialization run. */
export interface MaterializationResult {
  readonly featureSetId: string;
  readonly values: ReadonlyArray<FeatureValue>;
  readonly errorCount: number;
  readonly errors: ReadonlyArray<{ entityId: string; featureId: string; message: string }>;
}

/**
 * Materialize feature values from raw entity records, applying per-feature transform pipelines.
 * Records that fail transforms are counted but do not abort the run.
 */
export function materialize(options: MaterializationOptions): Result<MaterializationResult, FeatureStoreError> {
  const { featureSet, specs, records } = options;

  if (specs.length === 0) {
    return err(new FSError(`No materialization specs provided for feature set '${featureSet.id}'`));
  }

  const values: FeatureValue[] = [];
  const errors: { entityId: string; featureId: string; message: string }[] = [];

  for (const record of records) {
    for (const spec of specs) {
      const rawValue = record.values[spec.featureId];
      const result = spec.transform.apply(rawValue);

      if (result.ok === false) {
        errors.push({
          entityId: record.entityId,
          featureId: spec.featureId,
          message: result.error instanceof Error ? result.error.message : String(result.error),
        });
        continue;
      }

      values.push(
        Object.freeze({
          featureId: spec.featureId,
          entityId: record.entityId,
          value: result.value,
          timestamp: record.timestamp,
        }),
      );
    }
  }

  return ok(
    Object.freeze({
      featureSetId: featureSet.id,
      values: Object.freeze(values),
      errorCount: errors.length,
      errors: Object.freeze(errors),
    }),
  );
}

/** Build a simple spec that applies the identity transform for each feature in the set. */
export function buildIdentitySpecs(
  featureIds: ReadonlyArray<string>,
): ReadonlyArray<FeatureMaterializationSpec> {
  return Object.freeze(
    featureIds.map((featureId) => ({
      featureId,
      transform: {
        name: "identity",
        apply(value: unknown): Result<unknown, FeatureStoreError> {
          return ok(value);
        },
      },
    })),
  );
}
