// Access review domain errors extending AppError hierarchy.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class AccessReviewNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Access review not found: ${id}`, opts);
  }
}

export class CertificationNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Certification not found: ${id}`, opts);
  }
}

export class DecisionNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Decision not found: ${id}`, opts);
  }
}

export class ReviewerNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Reviewer not found: ${id}`, opts);
  }
}

export class EntitlementNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Entitlement not found: ${id}`, opts);
  }
}

export class ReviewAlreadyClosedError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Access review is already closed: ${id}`, opts);
  }
}

export class DecisionAlreadyMadeError extends AppError {
  constructor(entitlementId: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Decision already made for entitlement: ${entitlementId}`, opts);
  }
}

export class ScheduleConflictError extends AppError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Schedule conflict: ${detail}`, opts);
  }
}

export class InvalidReviewStateError extends AppError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Invalid review state: ${detail}`, opts);
  }
}
