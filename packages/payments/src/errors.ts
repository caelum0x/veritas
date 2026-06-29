// Payment-domain error subclasses extending AppError for typed error handling.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class PaymentNotFoundError extends AppError {
  override readonly code = "NOT_FOUND" as const;
  constructor(id: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Payment not found: ${id}`, options);
  }
}

export class PaymentAlreadyProcessedError extends AppError {
  override readonly code = "CONFLICT" as const;
  constructor(id: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Payment already processed: ${id}`, options);
  }
}

export class PaymentDeclinedError extends AppError {
  override readonly code = "VALIDATION" as const;
  readonly declineReason: string;
  constructor(reason: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Payment declined: ${reason}`, options);
    this.declineReason = reason;
  }
}

export class InsufficientFundsError extends AppError {
  override readonly code = "VALIDATION" as const;
  constructor(options?: AppErrorOptions) {
    super("VALIDATION", 422, "Insufficient funds for payment", options);
  }
}

export class RefundNotEligibleError extends AppError {
  override readonly code = "CONFLICT" as const;
  constructor(reason: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Refund not eligible: ${reason}`, options);
  }
}

export class PayoutFailedError extends AppError {
  override readonly code = "INTERNAL" as const;
  constructor(reason: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Payout failed: ${reason}`, options);
  }
}

export class DuplicateIdempotencyKeyError extends AppError {
  override readonly code = "CONFLICT" as const;
  constructor(key: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Duplicate idempotency key: ${key}`, options);
  }
}

export class ProcessorUnavailableError extends AppError {
  override readonly code = "UNAVAILABLE" as const;
  constructor(processorId: string, options?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `Payment processor unavailable: ${processorId}`, options);
  }
}
