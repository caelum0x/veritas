// Domain-level error types for the analytics-api; wraps AppError patterns from @veritas/core.
import { AppError } from "@veritas/core";

/** Thrown when a requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} '${id}' not found`);
  }
}

/** Thrown when request body or params fail schema validation. */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION", message, details);
  }
}

/** Thrown when an operation conflicts with existing state. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}

/** Thrown when the caller lacks sufficient scope for an operation. */
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message);
  }
}

/** Thrown when a downstream package operation returns an unexpected error. */
export class UpstreamError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", message, { cause: String(cause) });
  }
}

/** Maps an unknown error to a string message for logging. */
export function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
