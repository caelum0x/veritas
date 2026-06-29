// Point-in-time join: retrieves feature values as-of a given timestamp per entity, preventing label leakage.

import { ok, type Result } from "@veritas/core";
import { type FeatureValue } from "./feature.js";
import { type FeatureStoreError } from "./errors.js";

/** An entity observation with an as-of timestamp for the join. */
export interface EntityObservation {
  readonly entityId: string;
  readonly asOf: string;
}

/** Index of stored feature values, keyed by featureId -> entityId -> time-sorted array. */
export type FeatureValueIndex = ReadonlyMap<string, ReadonlyMap<string, ReadonlyArray<FeatureValue>>>;

/**
 * Build a FeatureValueIndex from a flat array of FeatureValues.
 * Values within each (featureId, entityId) bucket are sorted ascending by timestamp.
 */
export function buildFeatureValueIndex(values: ReadonlyArray<FeatureValue>): FeatureValueIndex {
  const outer = new Map<string, Map<string, FeatureValue[]>>();

  for (const fv of values) {
    let byEntity = outer.get(fv.featureId);
    if (byEntity === undefined) {
      byEntity = new Map<string, FeatureValue[]>();
      outer.set(fv.featureId, byEntity);
    }
    let bucket = byEntity.get(fv.entityId);
    if (bucket === undefined) {
      bucket = [];
      byEntity.set(fv.entityId, bucket);
    }
    bucket.push(fv);
  }

  // Sort each bucket ascending by timestamp and freeze
  const frozen = new Map<string, ReadonlyMap<string, ReadonlyArray<FeatureValue>>>();
  for (const [featureId, byEntity] of outer) {
    const frozenInner = new Map<string, ReadonlyArray<FeatureValue>>();
    for (const [entityId, bucket] of byEntity) {
      frozenInner.set(
        entityId,
        Object.freeze([...bucket].sort((a, b) => a.timestamp.localeCompare(b.timestamp))),
      );
    }
    frozen.set(featureId, frozenInner);
  }

  return frozen;
}

/** Result of a point-in-time join: entityId -> featureId -> FeatureValue (or null if none available). */
export type PitJoinResult = ReadonlyMap<string, ReadonlyMap<string, FeatureValue | null>>;

/**
 * Perform a point-in-time join.
 * For each (entity, feature) pair, finds the most recent FeatureValue
 * whose timestamp <= observation.asOf, preventing future data leakage.
 */
export function pointInTimeJoin(
  observations: ReadonlyArray<EntityObservation>,
  featureIds: ReadonlyArray<string>,
  index: FeatureValueIndex,
): Result<PitJoinResult, FeatureStoreError> {
  const result = new Map<string, ReadonlyMap<string, FeatureValue | null>>();

  for (const obs of observations) {
    const byFeature = new Map<string, FeatureValue | null>();

    for (const featureId of featureIds) {
      const byEntity = index.get(featureId);
      const bucket = byEntity?.get(obs.entityId);

      if (bucket === undefined || bucket.length === 0) {
        byFeature.set(featureId, null);
        continue;
      }

      // Binary search for the rightmost value with timestamp <= asOf
      let lo = 0;
      let hi = bucket.length - 1;
      let found: FeatureValue | null = null;

      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const fv = bucket[mid]!;
        if (fv.timestamp <= obs.asOf) {
          found = fv;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      byFeature.set(featureId, found);
    }

    result.set(obs.entityId, byFeature);
  }

  return ok(result);
}

/**
 * Flatten a PitJoinResult into an array of FeatureValues, omitting null entries.
 */
export function flattenPitResult(joinResult: PitJoinResult): ReadonlyArray<FeatureValue> {
  const out: FeatureValue[] = [];
  for (const byFeature of joinResult.values()) {
    for (const fv of byFeature.values()) {
      if (fv !== null) out.push(fv);
    }
  }
  return Object.freeze(out);
}
