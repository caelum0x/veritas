// Domain errors for @veritas/ml-scoring: typed error hierarchy for model and scoring failures.
import { AppError, type ErrorCode } from "@veritas/core";

export class MlScoringError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, "ML scoring error", { message, cause });
  }
}

export class ModelNotFoundError extends AppError {
  readonly modelId: string;
  constructor(modelId: string) {
    super("NOT_FOUND" as ErrorCode, 404, "Model not found", { message: `Model not found: ${modelId}` });
    this.modelId = modelId;
  }
}

export class ModelAlreadyRegisteredError extends AppError {
  readonly modelId: string;
  constructor(modelId: string) {
    super("CONFLICT" as ErrorCode, 409, "Model already registered", {
      message: `Model already registered: ${modelId}`,
    });
    this.modelId = modelId;
  }
}

export class FeatureVectorError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION" as ErrorCode, 422, "Feature vector error", { message, cause });
  }
}

export class ScoringError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, "Scoring error", { message, cause });
  }
}

export class ModelValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION" as ErrorCode, 422, "Model validation error", { message });
  }
}

export class EnsembleError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, "Ensemble error", { message, cause });
  }
}

export class ExplainabilityError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, "Explainability error", { message, cause });
  }
}
