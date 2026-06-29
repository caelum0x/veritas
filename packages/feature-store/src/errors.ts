// Errors specific to the feature-store package.

import { AppError } from "@veritas/core";

/** Base class for all feature-store errors. */
export class FeatureStoreError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "FeatureStoreError";
  }
}

/** Thrown when a feature or feature set is not found. */
export class FeatureNotFoundError extends FeatureStoreError {
  constructor(id: string) {
    super(`Feature not found: ${id}`);
    this.name = "FeatureNotFoundError";
  }
}

/** Thrown when a feature set is not found. */
export class FeatureSetNotFoundError extends FeatureStoreError {
  constructor(id: string) {
    super(`FeatureSet not found: ${id}`);
    this.name = "FeatureSetNotFoundError";
  }
}

/** Thrown when a feature with the same name already exists. */
export class FeatureAlreadyExistsError extends FeatureStoreError {
  constructor(name: string) {
    super(`Feature already exists: ${name}`);
    this.name = "FeatureAlreadyExistsError";
  }
}

/** Thrown when a feature value write fails. */
export class FeatureWriteError extends FeatureStoreError {
  constructor(message: string, cause?: unknown) {
    super(`Feature write failed: ${message}`, cause);
    this.name = "FeatureWriteError";
  }
}

/** Thrown when feature value validation fails. */
export class FeatureValidationError extends FeatureStoreError {
  constructor(featureId: string, reason: string) {
    super(`Feature value validation failed for ${featureId}: ${reason}`);
    this.name = "FeatureValidationError";
  }
}

/** Thrown when a materialization job fails. */
export class MaterializationError extends FeatureStoreError {
  constructor(featureSetId: string, reason: string) {
    super(`Materialization failed for feature set ${featureSetId}: ${reason}`);
    this.name = "MaterializationError";
  }
}

/** Thrown when a point-in-time join cannot be completed. */
export class PointInTimeJoinError extends FeatureStoreError {
  constructor(reason: string) {
    super(`Point-in-time join failed: ${reason}`);
    this.name = "PointInTimeJoinError";
  }
}

/** Thrown when a transform pipeline step fails. */
export class TransformError extends FeatureStoreError {
  constructor(transformId: string, reason: string) {
    super(`Transform ${transformId} failed: ${reason}`);
    this.name = "TransformError";
  }
}
