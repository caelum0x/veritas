// Domain-specific error classes for the bias-detection module.
import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when bias analysis fails due to an internal processing error. */
export class BiasDetectionError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "message"> = {}) {
    super("INTERNAL", 500, "Bias detection failed", { ...options, message });
  }
}

/** Raised when the LLM-backed bias analysis call fails. */
export class LLMBiasAnalysisError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "message"> = {}) {
    super("UNAVAILABLE", 503, "LLM bias analysis unavailable", { ...options, message });
  }
}

/** Raised when a source bias profile cannot be located. */
export class SourceBiasLookupError extends AppError {
  constructor(sourceId: string, options: Omit<AppErrorOptions, "message"> = {}) {
    super("NOT_FOUND", 404, "Source bias profile not found", {
      ...options,
      message: `Source bias profile not found: ${sourceId}`,
      details: { sourceId, ...options.details },
    });
  }
}

/** Raised when input text is empty or otherwise invalid for analysis. */
export class InvalidBiasInputError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "message"> = {}) {
    super("VALIDATION", 400, "Invalid input for bias detection", { ...options, message });
  }
}
