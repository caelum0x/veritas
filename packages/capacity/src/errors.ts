// Capacity-package-specific error subtypes extending AppError.
import { AppError, AppErrorOptions } from "@veritas/core";

export class CapacityModelError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

export class InsufficientDataError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 422, message, opts);
  }
}

export class ForecastError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

export class SaturationError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

export class RecommendationError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}
