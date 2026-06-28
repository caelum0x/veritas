// errors.ts: domain errors for the usage-billing module.

import { AppError, AppErrorOptions } from "@veritas/core";

export class UsageLimitExceededError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("RATE_LIMITED", 429, "Usage limit exceeded", opts);
    this.name = "UsageLimitExceededError";
  }
}

export class MeterNotFoundError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, "Meter not found", opts);
    this.name = "MeterNotFoundError";
  }
}

export class InvalidUsageQuantityError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, "Invalid usage quantity", opts);
    this.name = "InvalidUsageQuantityError";
  }
}

export class BillingWindowError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, "Invalid billing window", opts);
    this.name = "BillingWindowError";
  }
}

export class AggregationError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Usage aggregation failed", opts);
    this.name = "AggregationError";
  }
}
