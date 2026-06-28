// Domain-specific error classes for auth-server HTTP layer.

import { AppError } from "@veritas/core";

/** Raised when a required idempotency key header is missing or malformed. */
export class IdempotencyKeyError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 400, "Idempotency key error", { message });
    this.name = "IdempotencyKeyError";
  }
}

/** Raised when request pagination parameters are invalid. */
export class PaginationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, "Pagination error", { message });
    this.name = "PaginationError";
  }
}

/** Raised when an incoming request body fails schema validation. */
export class RequestValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION", 422, "Request validation failed", { message, details });
    this.name = "RequestValidationError";
  }
}

/** Raised when a duplicate request is detected via idempotency key. */
export class DuplicateRequestError extends AppError {
  constructor(key: string) {
    super("CONFLICT", 409, "Duplicate request", { message: `Duplicate request for key: ${key}` });
    this.name = "DuplicateRequestError";
  }
}
