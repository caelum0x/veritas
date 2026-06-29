// Credit-specific error types extending the core AppError hierarchy.

import { AppError, type AppErrorOptions } from "@veritas/core";
import { type CreditAmount } from "./credit.js";

/** Raised when an account has insufficient available credits. */
export class InsufficientCreditsError extends AppError {
  readonly required: CreditAmount;
  readonly available: CreditAmount;

  constructor(
    required: CreditAmount,
    available: CreditAmount,
    options?: Partial<AppErrorOptions>,
  ) {
    super(
      "VALIDATION",
      402,
      `Insufficient credits: required ${required}, available ${available}`,
      options,
    );
    this.required = required;
    this.available = available;
  }
}

/** Raised when a referenced credit grant does not exist. */
export class GrantNotFoundError extends AppError {
  readonly grantId: string;

  constructor(grantId: string, options?: Partial<AppErrorOptions>) {
    super(
      "NOT_FOUND",
      404,
      `Credit grant '${grantId}' not found`,
      options,
    );
    this.grantId = grantId;
  }
}

/** Raised when a credit grant has already expired. */
export class GrantExpiredError extends AppError {
  readonly grantId: string;
  readonly expiresAt: string;

  constructor(grantId: string, expiresAt: string, options?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      410,
      `Credit grant '${grantId}' expired at ${expiresAt}`,
      options,
    );
    this.grantId = grantId;
    this.expiresAt = expiresAt;
  }
}

/** Raised when a credit grant has been fully exhausted. */
export class GrantExhaustedError extends AppError {
  readonly grantId: string;

  constructor(grantId: string, options?: Partial<AppErrorOptions>) {
    super(
      "CONFLICT",
      409,
      `Credit grant '${grantId}' has no remaining credits`,
      options,
    );
    this.grantId = grantId;
  }
}

/** Raised when a credit reservation does not exist or has already been released. */
export class ReservationNotFoundError extends AppError {
  readonly reservationId: string;

  constructor(reservationId: string, options?: Partial<AppErrorOptions>) {
    super(
      "NOT_FOUND",
      404,
      `Credit reservation '${reservationId}' not found`,
      options,
    );
    this.reservationId = reservationId;
  }
}

/** Raised when attempting to consume more credits than a reservation holds. */
export class ReservationOverdrawError extends AppError {
  readonly reservationId: string;
  readonly requested: CreditAmount;
  readonly held: CreditAmount;

  constructor(
    reservationId: string,
    requested: CreditAmount,
    held: CreditAmount,
    options?: Partial<AppErrorOptions>,
  ) {
    super(
      "VALIDATION",
      422,
      `Cannot consume ${requested} credits from reservation '${reservationId}' holding ${held}`,
      options,
    );
    this.reservationId = reservationId;
    this.requested = requested;
    this.held = held;
  }
}

/** Raised when a credit policy violation is detected (e.g. per-period cap exceeded). */
export class CreditPolicyViolationError extends AppError {
  readonly policy: string;

  constructor(policy: string, detail: string, options?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Credit policy '${policy}' violated: ${detail}`,
      options,
    );
    this.policy = policy;
  }
}
