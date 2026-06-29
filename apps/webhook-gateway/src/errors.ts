// Application-level error types for the webhook-gateway service.

import { AppError } from "@veritas/core";

export class ReplayDetectedError extends AppError {
  readonly deliveryId: string;

  constructor(deliveryId: string) {
    super("CONFLICT", 409, `Duplicate webhook delivery rejected: ${deliveryId}`);
    this.name = "ReplayDetectedError";
    this.deliveryId = deliveryId;
  }
}

export class UnknownSourceError extends AppError {
  readonly source: string;

  constructor(source: string) {
    super("VALIDATION", 422, `Unknown webhook source: ${source}`);
    this.name = "UnknownSourceError";
    this.source = source;
  }
}

export class MissingHeaderError extends AppError {
  readonly header: string;

  constructor(header: string) {
    super("VALIDATION", 400, `Missing required header: ${header}`);
    this.name = "MissingHeaderError";
    this.header = header;
  }
}

export class SignatureVerificationError extends AppError {
  constructor(reason: string) {
    super("UNAUTHORIZED", 401, `Webhook signature verification failed: ${reason}`);
    this.name = "SignatureVerificationError";
  }
}

export class PayloadParseError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Webhook payload parse error: ${detail}`);
    this.name = "PayloadParseError";
  }
}

export class HandlerError extends AppError {
  readonly eventType: string;

  constructor(eventType: string, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super("INTERNAL", 500, `Handler failed for event type ${eventType}: ${msg}`);
    this.name = "HandlerError";
    this.eventType = eventType;
  }
}

export class IdempotencyConflictError extends AppError {
  readonly idempotencyKey: string;

  constructor(key: string) {
    super("CONFLICT", 409, `Idempotency key already used: ${key}`);
    this.name = "IdempotencyConflictError";
    this.idempotencyKey = key;
  }
}

export class RateLimitExceededError extends AppError {
  constructor(retryAfterSec?: number) {
    const msg = retryAfterSec
      ? `Rate limit exceeded. Retry after ${retryAfterSec}s.`
      : "Rate limit exceeded.";
    super("RATE_LIMITED", 429, msg);
    this.name = "RateLimitExceededError";
  }
}
