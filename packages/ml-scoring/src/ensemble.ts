// Ensemble model: combines multiple Model instances via weighted average scoring.

import { ok, err, type Result, asScore, clampScore } from "@veritas/core";
import type { Model, ModelMeta, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { EnsembleError, ModelValidationError } from "./errors.js";

/** A member model and its normalized weight within the ensemble. */
export interface EnsembleMember {
  readonly model: Model;
  readonly weight: number;
}

/** Configuration for constructing an EnsembleModel. */
export interface EnsembleConfig {
  readonly meta: ModelMeta;
  readonly members: ReadonlyArray<EnsembleMember>;
}

function normalizeWeights(members: ReadonlyArray<EnsembleMember>): ReadonlyArray<EnsembleMember> {
  const total = members.reduce((s, m) => s + m.weight, 0);
  if (total === 0) throw new ModelValidationError("Ensemble weights sum to zero");
  return Object.freeze(members.map((m) => Object.freeze({ model: m.model, weight: m.weight / total })));
}

function weightedScore(members: ReadonlyArray<EnsembleMember>, predictions: ReadonlyArray<RawPrediction>): number {
  return members.reduce((acc, m, i) => acc + m.weight * (predictions[i]?.score ?? 0), 0);
}

function weightedConfidence(members: ReadonlyArray<EnsembleMember>, predictions: ReadonlyArray<RawPrediction>): number {
  return clampScore(members.reduce((acc, m, i) => acc + m.weight * (predictions[i]?.confidence ?? 0), 0));
}

/** Ensemble model that aggregates multiple sub-model predictions via weighted average. */
export class EnsembleModel implements Model {
  readonly meta: ModelMeta;
  private readonly members: ReadonlyArray<EnsembleMember>;

  constructor(config: EnsembleConfig) {
    if (config.members.length === 0) {
      throw new ModelValidationError("EnsembleModel requires at least one member");
    }
    this.meta = config.meta;
    this.members = normalizeWeights(config.members);
  }

  async predict(features: FeatureVector): Promise<Result<RawPrediction, MlScoringError>> {
    const predictions: RawPrediction[] = [];
    for (const { model } of this.members) {
      const r = await model.predict(features);
      if (r.ok === false) return err(new EnsembleError(`Member model ${model.meta.modelId} failed`, r.error));
      predictions.push(r.value);
    }
    const score = asScore(weightedScore(this.members, predictions));
    const confidence = weightedConfidence(this.members, predictions);
    return ok(
      Object.freeze({
        score,
        confidence,
        metadata: Object.freeze({
          modelId: this.meta.modelId,
          memberScores: Object.freeze(
            this.members.map((m, i) => ({ modelId: m.model.meta.modelId, score: predictions[i]?.score ?? 0, weight: m.weight })),
          ),
        }),
      }),
    );
  }

  async predictBatch(
    featureVectors: ReadonlyArray<FeatureVector>,
  ): Promise<Result<ReadonlyArray<RawPrediction>, MlScoringError>> {
    const results: RawPrediction[] = [];
    for (const fv of featureVectors) {
      const r = await this.predict(fv);
      if (r.ok === false) return r;
      results.push(r.value);
    }
    return ok(Object.freeze(results));
  }
}

/** Factory for EnsembleModel; returns a validation error on invalid config. */
export function makeEnsembleModel(config: EnsembleConfig): Result<EnsembleModel, MlScoringError> {
  try {
    return ok(new EnsembleModel(config));
  } catch (cause) {
    if (cause instanceof ModelValidationError) return err(cause);
    return err(new EnsembleError("Failed to construct EnsembleModel", cause));
  }
}
