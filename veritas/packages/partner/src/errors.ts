// Partner-domain error classes extending the core AppError hierarchy.

import {
  AppError,
  type AppErrorOptions,
  ConflictError,
  NotFoundError,
} from "@veritas/core";

/** Thrown when a partner entity (org, agreement, etc.) is not found. */
export class PartnerNotFoundError extends NotFoundError {
  static of(resource: string, key?: string): PartnerNotFoundError {
    return Object.assign(
      new PartnerNotFoundError({
        message: key ? `${resource} not found: ${key}` : `${resource} not found`,
        details: { resource, ...(key ? { key } : {}) },
      }),
    );
  }

  constructor(options: AppErrorOptions = {}) {
    super(options);
    Object.setPrototypeOf(this, PartnerNotFoundError.prototype);
  }
}

/** Thrown when a partner already exists or a duplicate resource is created. */
export class PartnerConflictError extends ConflictError {
  static of(resource: string, key?: string): PartnerConflictError {
    return new PartnerConflictError({
      message: key ? `${resource} already exists: ${key}` : `${resource} already exists`,
      details: { resource, ...(key ? { key } : {}) },
    });
  }

  constructor(options: AppErrorOptions = {}) {
    super(options);
    Object.setPrototypeOf(this, PartnerConflictError.prototype);
  }
}

/** Thrown when a partner tier or quota check fails. */
export class PartnerAccessDeniedError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("FORBIDDEN", 403, "Partner access denied", options);
    Object.setPrototypeOf(this, PartnerAccessDeniedError.prototype);
  }

  static of(reason: string): PartnerAccessDeniedError {
    return new PartnerAccessDeniedError({ message: reason, details: { reason } });
  }
}

/** Thrown when a partner quota (API calls, seats, etc.) is exhausted. */
export class PartnerQuotaExceededError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("RATE_LIMITED", 429, "Partner quota exceeded", options);
    Object.setPrototypeOf(this, PartnerQuotaExceededError.prototype);
  }

  static of(metric: string, limit: number): PartnerQuotaExceededError {
    return new PartnerQuotaExceededError({
      message: `Partner quota exceeded for ${metric}: limit ${limit}`,
      details: { metric, limit },
    });
  }
}

/** Thrown when onboarding state is invalid or a step is out of order. */
export class PartnerOnboardingError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("VALIDATION", 422, "Partner onboarding error", options);
    Object.setPrototypeOf(this, PartnerOnboardingError.prototype);
  }

  static of(step: string, reason: string): PartnerOnboardingError {
    return new PartnerOnboardingError({
      message: `Onboarding step "${step}" failed: ${reason}`,
      details: { step, reason },
    });
  }
}

/** Thrown when a partner agreement is missing, expired, or unsigned. */
export class PartnerAgreementError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("FORBIDDEN", 403, "Partner agreement invalid", options);
    Object.setPrototypeOf(this, PartnerAgreementError.prototype);
  }

  static of(reason: string): PartnerAgreementError {
    return new PartnerAgreementError({ message: reason, details: { reason } });
  }
}
