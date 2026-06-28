// Recommendation-domain errors extending AppError.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class RecommendationError extends AppError {
  constructor(message: string, cause?: unknown) {
    const options: AppErrorOptions = { message, ...(cause !== undefined ? { cause } : {}) };
    super("INTERNAL", 500, "Recommendation error", options);
    this.name = "RecommendationError";
  }
}

export class InsufficientDataError extends RecommendationError {
  constructor(detail = "not enough interaction data to generate recommendations") {
    super(detail);
    this.name = "InsufficientDataError";
  }
}

export class ItemNotFoundError extends RecommendationError {
  constructor(itemId: string) {
    super(`item not found: ${itemId}`);
    this.name = "ItemNotFoundError";
  }
}

export class UnsupportedStrategyError extends RecommendationError {
  constructor(strategy: string) {
    super(`unsupported recommendation strategy: ${strategy}`);
    this.name = "UnsupportedStrategyError";
  }
}

export class FeedbackError extends RecommendationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "FeedbackError";
  }
}
