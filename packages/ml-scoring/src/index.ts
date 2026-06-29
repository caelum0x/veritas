// Public surface of @veritas/ml-scoring: models, scoring, feature vectors, and error types.

export type { ModelKind, ModelMeta, RawPrediction, Model } from "./model.js";

export type { FeatureEntry, FeatureVector } from "./feature-vector.js";
export {
  featureEntrySchema,
  featureVectorSchema,
  makeFeatureVector,
  getNumeric,
  toNumericArray,
} from "./feature-vector.js";

export type {
  Prediction,
  FeatureImportance,
  Explanation,
  ModelMetadata,
  EnsembleWeight,
  ScoringContext,
} from "./types.js";
export {
  predictionSchema,
  featureImportanceSchema,
  explanationSchema,
  modelMetadataSchema,
  ensembleWeightSchema,
  scoringContextSchema,
} from "./types.js";

export {
  MlScoringError,
  ModelNotFoundError,
  ModelAlreadyRegisteredError,
  FeatureVectorError,
  ScoringError,
  EnsembleError,
  ExplainabilityError,
} from "./errors.js";
