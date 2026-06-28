// Logistic regression scorer: generic binary logistic regression model over a feature vector.

import { ok, err, type Result, asScore, clampScore } from "@veritas/core";
import type { Model, ModelMeta, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import { getNumeric } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ScoringError, ModelValidationError } from "./errors.js";

/** Configuration for a logistic regression model instance. */
export interface LogisticModelConfig {
  readonly meta: ModelMeta;
  /** Feature weights keyed by featureId. */
  readonly weights: Readonly<Record<string, number>>;
  /** Intercept / bias term. */
  readonly bias: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computeLogit(weights: Readonly<Record<string, number>>, bias: number, vector: FeatureVector): number {
  return Object.entries(weights).reduce((acc, [featureId, w]) => {
    return acc + w * (getNumeric(vector, featureId) ?? 0);
  }, bias);
}

function coverageConfidence(weights: Readonly<Record<string, number>>, vector: FeatureVector): number {
  const total = Object.keys(weights).length;
  if (total === 0) return 1;
  const present = Object.keys(weights).filter((fid) => getNumeric(vector, fid) !== undefined).length;
  return clampScore(present / total);
}

/** Generic logistic regression Model implementation. */
export class LogisticModel implements Model {
  readonly meta: ModelMeta;
  private readonly weights: Readonly<Record<string, number>>;
  private readonly bias: number;

  constructor(config: LogisticModelConfig) {
    if (Object.keys(config.weights).length === 0) {
      throw new ModelValidationError("LogisticModel requires at least one weight");
    }
    this.meta = config.meta;
    this.weights = Object.freeze({ ...config.weights });
    this.bias = config.bias;
  }

  async predict(features: FeatureVector): Promise<Result<RawPrediction, MlScoringError>> {
    try {
      const logit = computeLogit(this.weights, this.bias, features);
      const score = asScore(sigmoid(logit));
      const confidence = coverageConfidence(this.weights, features);
      return ok(
        Object.freeze({
          score,
          confidence,
          metadata: Object.freeze({ logit, modelId: this.meta.modelId }),
        }),
      );
    } catch (cause) {
      return err(new ScoringError("Logistic prediction failed", cause));
    }
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

/** Factory to build a LogisticModel, returning a validation error on bad config. */
export function makeLogisticModel(
  config: LogisticModelConfig,
): Result<LogisticModel, MlScoringError> {
  try {
    return ok(new LogisticModel(config));
  } catch (cause) {
    if (cause instanceof ModelValidationError) return err(cause);
    return err(new ScoringError("Failed to construct LogisticModel", cause));
  }
}
