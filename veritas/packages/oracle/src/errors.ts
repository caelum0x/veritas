// Oracle-specific error types for the @veritas/oracle package

import { AppError, type AppErrorOptions } from "@veritas/core";

export class OracleError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.name = "OracleError";
  }
}

export class FeedNotFoundError extends AppError {
  constructor(feedId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Oracle feed not found: ${feedId}`, options);
    this.name = "FeedNotFoundError";
  }
}

export class StaleDataError extends AppError {
  constructor(feedId: string, ageSeconds: number, maxAgeSeconds: number, options?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `Feed "${feedId}" data is stale: age=${ageSeconds}s exceeds max=${maxAgeSeconds}s`,
      options
    );
    this.name = "StaleDataError";
  }
}

export class RoundNotFoundError extends AppError {
  constructor(feedId: string, roundId: number, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Round ${roundId} not found for feed: ${feedId}`, options);
    this.name = "RoundNotFoundError";
  }
}

export class InvalidRoundError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Invalid round data: ${message}`, options);
    this.name = "InvalidRoundError";
  }
}

export class FeedRegistryError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Feed registry error: ${message}`, options);
    this.name = "FeedRegistryError";
  }
}

export class AggregationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Aggregation error: ${message}`, options);
    this.name = "AggregationError";
  }
}

export class NoAnswerError extends AppError {
  constructor(feedId: string, options?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `No answer available for feed: ${feedId}`, options);
    this.name = "NoAnswerError";
  }
}

export class OracleUnavailableError extends AppError {
  constructor(cause?: unknown, options?: AppErrorOptions) {
    super("UNAVAILABLE", 503, "Oracle service is unavailable", { ...options, cause });
    this.name = "OracleUnavailableError";
  }
}
