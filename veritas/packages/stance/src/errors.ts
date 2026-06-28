// Stance-specific error types extending AppError
import { AppError } from "@veritas/core";

export class StanceDetectionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Stance detection error", { message, cause });
    this.name = "StanceDetectionError";
  }
}

export class StanceLLMError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, "LLM service unavailable", { message, cause });
    this.name = "StanceLLMError";
  }
}

export class StanceParseError extends AppError {
  constructor(raw: string) {
    super("VALIDATION", 422, "Stance parse error", { message: `Cannot parse stance from LLM output: ${raw.slice(0, 120)}` });
    this.name = "StanceParseError";
  }
}

export class StanceWeightError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, "Stance weight error", { message });
    this.name = "StanceWeightError";
  }
}

export class StanceAggregationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Stance aggregation error", { message, cause });
    this.name = "StanceAggregationError";
  }
}
