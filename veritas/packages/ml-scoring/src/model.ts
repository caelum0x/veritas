// Model port: abstract interface for ML scoring models used in the veritas platform.

import type { Result } from "@veritas/core";
import type { FeatureVector } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";

/** Supported ML model kinds. */
export type ModelKind = "logistic" | "ensemble" | "trust" | "risk" | "source-credibility";

/** Metadata describing a registered model instance. */
export interface ModelMeta {
  readonly modelId: string;
  readonly name: string;
  readonly kind: ModelKind;
  readonly version: string;
  readonly featureIds: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly description: string;
}

/** A raw prediction returned by a model before post-processing. */
export interface RawPrediction {
  readonly score: number;
  readonly confidence: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Port interface every ML model must implement. */
export interface Model {
  readonly meta: ModelMeta;

  /** Score a single feature vector and return a raw prediction. */
  predict(features: FeatureVector): Promise<Result<RawPrediction, MlScoringError>>;

  /** Batch prediction for multiple feature vectors. */
  predictBatch(
    featureVectors: ReadonlyArray<FeatureVector>,
  ): Promise<Result<ReadonlyArray<RawPrediction>, MlScoringError>>;
}
