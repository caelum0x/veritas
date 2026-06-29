// Webhook-specific error classes for the webhooks package.

import { AppError } from "@veritas/core";

export class WebhookSignatureError extends AppError {
  constructor(message = "Webhook signature verification failed") {
    super("UNAUTHORIZED", 401, message);
    this.name = "WebhookSignatureError";
  }
}

export class WebhookDeliveryError extends AppError {
  readonly statusCode: number | null;
  readonly responseBody: string | null;

  constructor(message: string, statusCode: number | null = null, responseBody: string | null = null) {
    super("UNAVAILABLE", 503, message);
    this.name = "WebhookDeliveryError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class WebhookSubscriptionNotFoundError extends AppError {
  readonly subscriptionId: string;

  constructor(subscriptionId: string) {
    super("NOT_FOUND", 404, `Webhook subscription not found: ${subscriptionId}`);
    this.name = "WebhookSubscriptionNotFoundError";
    this.subscriptionId = subscriptionId;
  }
}

export class WebhookSubscriptionConflictError extends AppError {
  constructor(message = "Webhook subscription already exists") {
    super("CONFLICT", 409, message);
    this.name = "WebhookSubscriptionConflictError";
  }
}

export class WebhookInvalidEventTypeError extends AppError {
  readonly eventType: string;

  constructor(eventType: string) {
    super("VALIDATION", 422, `Unknown webhook event type: ${eventType}`);
    this.name = "WebhookInvalidEventTypeError";
    this.eventType = eventType;
  }
}

export class WebhookRetryExhaustedError extends AppError {
  readonly deliveryId: string;
  readonly attempts: number;

  constructor(deliveryId: string, attempts: number) {
    super("UNAVAILABLE", 503, `Webhook delivery exhausted after ${attempts} attempts: ${deliveryId}`);
    this.name = "WebhookRetryExhaustedError";
    this.deliveryId = deliveryId;
    this.attempts = attempts;
  }
}
