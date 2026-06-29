// Domain-specific HTTP error classes for the privacy-api, extending AppError from @veritas/core.

import { AppError } from "@veritas/core";

export class DsrNotFoundHttpError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `DSR not found: ${id}`);
  }
}

export class DsrAlreadyCompletedHttpError extends AppError {
  constructor(id: string) {
    super("CONFLICT", 409, `DSR already in terminal state: ${id}`);
  }
}

export class ConsentNotFoundHttpError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Consent record not found: ${id}`);
  }
}

export class RetentionPolicyNotFoundHttpError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Retention policy not found: ${id}`);
  }
}

export class IdentityVerificationHttpError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 422, `Identity verification failed: ${reason}`);
  }
}

export class ErasureBlockedHttpError extends AppError {
  constructor(reason: string) {
    super("CONFLICT", 409, `Erasure blocked: ${reason}`);
  }
}

export class ValidationHttpError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 400, message);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(key: string) {
    super("CONFLICT", 409, `Idempotency key already used: ${key}`);
  }
}
