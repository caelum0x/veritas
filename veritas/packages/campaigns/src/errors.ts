// Campaign-specific application errors extending AppError.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class CampaignNotFoundError extends AppError {
  constructor(id: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Campaign not found: ${id}`, opts);
  }
}

export class CampaignConflictError extends AppError {
  constructor(msg: string, opts: AppErrorOptions = {}) {
    super("CONFLICT", 409, msg, opts);
  }
}

export class CampaignValidationError extends AppError {
  constructor(msg: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, msg, opts);
  }
}

export class AudienceEmptyError extends AppError {
  constructor(campaignId: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Audience is empty for campaign: ${campaignId}`, opts);
  }
}

export class CampaignThrottledError extends AppError {
  readonly retryAfterMs: number;
  constructor(campaignId: string, retryAfterMs: number, opts: AppErrorOptions = {}) {
    super("RATE_LIMITED", 429, `Campaign ${campaignId} throttled; retry after ${retryAfterMs}ms`, opts);
    this.retryAfterMs = retryAfterMs;
  }
}

export class CampaignSendError extends AppError {
  constructor(msg: string, opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, msg, opts);
  }
}

export class ABTestError extends AppError {
  constructor(msg: string, opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, msg, opts);
  }
}

export type CampaignError =
  | CampaignNotFoundError
  | CampaignConflictError
  | CampaignValidationError
  | AudienceEmptyError
  | CampaignThrottledError
  | CampaignSendError
  | ABTestError;
