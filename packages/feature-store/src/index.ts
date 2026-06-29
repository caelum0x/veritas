// Public surface of @veritas/feature-store: feature definitions, types, errors, and store interfaces.

export type {
  FeatureValueType,
  Feature,
  CreateFeatureInput,
  FeatureValue,
} from "./feature.js";

export {
  featureValueTypeSchema,
  featureSchema,
  createFeatureInputSchema,
  featureValueSchema,
  makeFeature,
} from "./feature.js";

export type {
  EntityKey,
  FeatureLookupRequest,
  ResolvedFeatureValue,
  FeatureLookupResponse,
  TrainingRow,
  OfflineRetrievalOptions,
  MaterializationStatus,
  MaterializationRun,
} from "./types.js";

export {
  entityKeySchema,
  featureLookupRequestSchema,
  resolvedFeatureValueSchema,
  featureLookupResponseSchema,
  trainingRowSchema,
  offlineRetrievalOptionsSchema,
  materializationStatusSchema,
  materializationRunSchema,
} from "./types.js";

export {
  FeatureStoreError,
  FeatureNotFoundError,
  FeatureSetNotFoundError,
  FeatureAlreadyExistsError,
  FeatureWriteError,
  FeatureValidationError,
  MaterializationError,
  PointInTimeJoinError,
  TransformError,
} from "./errors.js";
