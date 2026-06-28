// Typed error classes for the webhooks-sdk package.

import { AppError } from "@veritas/core";

export class WebhookSignatureError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 400, message);
    this.name = "WebhookSignatureError";
  }
}

export class WebhookParseError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, message);
    this.name = "WebhookParseError";
  }
}

export class WebhookReplayError extends AppError {
  constructor(eventId: string) {
    super("CONFLICT", 409, `Duplicate event detected: ${eventId}`);
    this.name = "WebhookReplayError";
  }
}

export class WebhookHandlerNotFoundError extends AppError {
  constructor(eventType: string) {
    super("NOT_FOUND", 404, `No handler registered for event type: ${eventType}`);
    this.name = "WebhookHandlerNotFoundError";
  }
}

export class WebhookClientError extends AppError {
  constructor(message: string, public readonly statusCode?: number) {
    super("UNAVAILABLE", statusCode ?? 500, message);
    this.name = "WebhookClientError";
  }
}
