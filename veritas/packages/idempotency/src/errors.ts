// Idempotency-specific error classes.
import { AppError } from "@veritas/core";

export class IdempotencyConflictError extends AppError {
  constructor(key: string) {
    super("CONFLICT", 409, `Request with idempotency key "${key}" is already in flight`, {
      details: { key },
    });
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyFingerprintMismatchError extends AppError {
  constructor(key: string) {
    super("CONFLICT", 422, `Request with idempotency key "${key}" was previously sent with different parameters`, {
      details: { key },
    });
    this.name = "IdempotencyFingerprintMismatchError";
  }
}

export class IdempotencyKeyMissingError extends AppError {
  constructor() {
    super("VALIDATION", 400, "Idempotency-Key header is required for this endpoint");
    this.name = "IdempotencyKeyMissingError";
  }
}

export class IdempotencyKeyInvalidError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 400, `Invalid Idempotency-Key: ${reason}`, {
      details: { reason },
    });
    this.name = "IdempotencyKeyInvalidError";
  }
}

export function isIdempotencyError(
  err: unknown,
): err is
  | IdempotencyConflictError
  | IdempotencyFingerprintMismatchError
  | IdempotencyKeyMissingError
  | IdempotencyKeyInvalidError {
  return (
    err instanceof IdempotencyConflictError ||
    err instanceof IdempotencyFingerprintMismatchError ||
    err instanceof IdempotencyKeyMissingError ||
    err instanceof IdempotencyKeyInvalidError
  );
}
