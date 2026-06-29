// Vector feature: wraps embedding vectors as typed FeatureValues for ML pipelines.

import { ok, err, type Result } from "@veritas/core";
import { type Embedder, type Vector, makeVector, toArray } from "@veritas/embeddings";
import { type FeatureValue } from "./feature.js";
import { type FeatureStoreError, FeatureStoreError as FSError } from "./errors.js";

/** A feature value whose payload is a dense embedding vector. */
export interface VectorFeatureValue {
  readonly featureId: string;
  readonly entityId: string;
  readonly vector: Vector;
  readonly model: string;
  readonly timestamp: string;
}

/** Convert a VectorFeatureValue to a generic FeatureValue (vector serialized as number[]). */
export function toFeatureValue(vfv: VectorFeatureValue): FeatureValue {
  return Object.freeze({
    featureId: vfv.featureId,
    entityId: vfv.entityId,
    value: toArray(vfv.vector),
    timestamp: vfv.timestamp,
  });
}

/** Attempt to extract a Vector from a generic FeatureValue whose value is number[]. */
export function fromFeatureValue(fv: FeatureValue): Result<VectorFeatureValue & { model: string }, FeatureStoreError> {
  if (!Array.isArray(fv.value) || (fv.value as unknown[]).some((x) => typeof x !== "number")) {
    return err(new FSError(`VectorFeature: value for ${fv.featureId} is not number[]`));
  }
  const nums = fv.value as number[];
  if (nums.length === 0) {
    return err(new FSError(`VectorFeature: empty vector for ${fv.featureId}`));
  }
  try {
    const vector = makeVector(nums);
    return ok(
      Object.freeze({
        featureId: fv.featureId,
        entityId: fv.entityId,
        vector,
        model: "unknown",
        timestamp: fv.timestamp,
      }),
    );
  } catch (e) {
    return err(new FSError(`VectorFeature: makeVector failed for ${fv.featureId}: ${String(e)}`));
  }
}

/** Options for embedding a batch of entity texts into vector feature values. */
export interface EmbedEntitiesOptions {
  readonly featureId: string;
  readonly entityTexts: ReadonlyArray<{ entityId: string; text: string }>;
  readonly embedder: Embedder;
  readonly timestamp?: string;
}

/** Embed a batch of entity texts into VectorFeatureValues using the supplied embedder. */
export async function embedEntities(
  options: EmbedEntitiesOptions,
): Promise<Result<ReadonlyArray<VectorFeatureValue>, FeatureStoreError>> {
  const { featureId, entityTexts, embedder } = options;
  const timestamp = options.timestamp ?? new Date().toISOString();

  if (entityTexts.length === 0) return ok(Object.freeze([]));

  const texts = entityTexts.map((e) => e.text);
  const batchResult = await embedder.embedBatch(texts);

  if (batchResult.ok === false) {
    return err(
      new FSError(
        `EmbedEntities failed for feature '${featureId}': ${
          batchResult.error instanceof Error ? batchResult.error.message : String(batchResult.error)
        }`,
      ),
    );
  }

  const vectors = batchResult.value;
  if (vectors.length !== entityTexts.length) {
    return err(
      new FSError(
        `EmbedEntities: embedder returned ${vectors.length} vectors for ${entityTexts.length} entities`,
      ),
    );
  }

  const result: VectorFeatureValue[] = entityTexts.map((entity, i) =>
    Object.freeze({
      featureId,
      entityId: entity.entityId,
      vector: vectors[i]!,
      model: embedder.meta.model,
      timestamp,
    }),
  );

  return ok(Object.freeze(result));
}

/** Compute cosine similarity between two VectorFeatureValues; returns null if dimensions differ. */
export function vectorSimilarity(a: VectorFeatureValue, b: VectorFeatureValue): number | null {
  const aArr = toArray(a.vector);
  const bArr = toArray(b.vector);
  if (aArr.length !== bArr.length) return null;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < aArr.length; i++) {
    const ai = aArr[i]!;
    const bi = bArr[i]!;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
