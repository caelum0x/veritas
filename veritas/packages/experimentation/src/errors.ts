// Experiment-domain error types extending AppError
import { AppError } from "@veritas/core";

export class ExperimentNotFoundError extends AppError {
  constructor(experimentId: string) {
    super("NOT_FOUND", 404, "Experiment not found", { message: `Experiment not found: ${experimentId}` });
    this.name = "ExperimentNotFoundError";
  }
}

export class ExperimentConflictError extends AppError {
  constructor(key: string) {
    super("CONFLICT", 409, "Experiment conflict", { message: `Experiment key already exists: ${key}` });
    this.name = "ExperimentConflictError";
  }
}

export class ExperimentValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, "Validation failed", { message });
    this.name = "ExperimentValidationError";
  }
}

export class ExperimentInactiveError extends AppError {
  constructor(experimentId: string) {
    super("VALIDATION", 422, "Experiment inactive", { message: `Experiment is not active: ${experimentId}` });
    this.name = "ExperimentInactiveError";
  }
}

export class TargetingError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, "Targeting error", { message });
    this.name = "TargetingError";
  }
}
