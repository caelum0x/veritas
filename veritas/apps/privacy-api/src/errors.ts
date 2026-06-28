// Domain-specific HTTP error classes for the privacy-api, extending AppError from @veritas/core.

import { AppError } from "@veritas/core";

export class DsrNotFoundHttpError extends AppError {
  constructor(id: string) {
    super(`DSR not found: ${id}`, { code: "DSR_NOT_FOUND", statusCode: 404 });
  }
}

export class DsrAlreadyCompletedHttpError extends AppError {
  constructor(id: string) {
    super(`DSR already in terminal state: ${id}`, { code: "DSR_ALREADY_COMPLETED", statusCode: 409 });
  }
}

export class ConsentNotFoundHttpError extends AppError {
  constructor(id: string) {
    super(`Consent record not found: ${id}`, { code: "CONSENT_NOT_FOUND", statusCode: 404 });
  }
}

export class RetentionPolicyNotFoundHttpError extends AppError {
  constructor(id: string) {
    super(`Retention policy not found: ${id}`, { code: "RETENTION_POLICY_NOT_FOUND", statusCode: 404 });
  }
}

export class IdentityVerificationHttpError extends AppError {
  constructor(reason: string) {
    super(`Identity verification failed: ${reason}`, { code: "IDENTITY_VERIFICATION_FAILED", statusCode: 422 });
  }
}

export class ErasureBlockedHttpError extends AppError {
  constructor(reason: string) {
    super(`Erasure blocked: ${reason}`, { code: "ERASURE_BLOCKED", statusCode: 409 });
  }
}

export class ValidationHttpError extends AppError {
  constructor(message: string) {
    super(message, { code: "VALIDATION_ERROR", statusCode: 400 });
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(key: string) {
    super(`Idempotency key already used: ${key}`, { code: "IDEMPOTENCY_CONFLICT", statusCode: 409 });
  }
}
