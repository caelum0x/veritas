// Privacy-specific error types for @veritas/privacy.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class PrivacyError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Privacy error", options);
  }
}

export class BudgetExhaustedError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 422, "Privacy budget exhausted", options);
  }
}

export class KAnonymityViolationError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 422, "Dataset does not satisfy k-anonymity", options);
  }
}

export class PrivacyConfigError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("VALIDATION", 400, "Invalid privacy configuration", options);
  }
}

export class InvalidNoiseParameterError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("VALIDATION", 400, "Invalid noise parameter", options);
  }
}
