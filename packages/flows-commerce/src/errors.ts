// Commerce flow domain errors extending AppError for structured error handling.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class CommerceFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Commerce flow error", opts);
  }
}

export class UsageMeterError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Usage meter error", opts);
  }
}

export class SubscriptionBillingError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Subscription billing error", opts);
  }
}

export class ChargeReceiptError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Charge receipt error", opts);
  }
}

export class RefundCreditError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Refund credit error", opts);
  }
}

export class DunningFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Dunning flow error", opts);
  }
}

export class HireSettleError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL", 500, opts.message ?? "Hire settle error", opts);
  }
}
