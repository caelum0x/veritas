// Domain events for the Webhook aggregate.
import type { WebhookDeliveryStatus } from "@veritas/contracts";

export const WEBHOOK_EVENT_TYPES = {
  WEBHOOK_CREATED: "webhook.created",
  WEBHOOK_UPDATED: "webhook.updated",
  WEBHOOK_DISABLED: "webhook.disabled",
  WEBHOOK_ENABLED: "webhook.enabled",
  WEBHOOK_DELETED: "webhook.deleted",
  DELIVERY_ATTEMPTED: "webhook.delivery_attempted",
  DELIVERY_SUCCEEDED: "webhook.delivery_succeeded",
  DELIVERY_FAILED: "webhook.delivery_failed",
  SECRET_ROTATED: "webhook.secret_rotated",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

export interface WebhookCreatedPayload {
  readonly webhookId: string;
  readonly organizationId: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly description?: string;
  readonly secret: string;
}

export interface WebhookUpdatedPayload {
  readonly webhookId: string;
  readonly url?: string;
  readonly events?: readonly string[];
  readonly description?: string;
}

export interface WebhookDisabledPayload {
  readonly webhookId: string;
  readonly reason?: string;
}

export interface WebhookEnabledPayload {
  readonly webhookId: string;
}

export interface WebhookDeletedPayload {
  readonly webhookId: string;
}

export interface DeliveryAttemptedPayload {
  readonly webhookId: string;
  readonly deliveryId: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly attemptNumber: number;
  readonly requestBody: string;
}

export interface DeliverySucceededPayload {
  readonly webhookId: string;
  readonly deliveryId: string;
  readonly statusCode: number;
  readonly responseBody?: string;
  readonly durationMs: number;
}

export interface DeliveryFailedPayload {
  readonly webhookId: string;
  readonly deliveryId: string;
  readonly statusCode?: number;
  readonly errorMessage: string;
  readonly durationMs: number;
  readonly nextRetryAt?: string;
  readonly status: WebhookDeliveryStatus;
}

export interface SecretRotatedPayload {
  readonly webhookId: string;
  readonly newSecret: string;
}

export type WebhookEventPayload =
  | WebhookCreatedPayload
  | WebhookUpdatedPayload
  | WebhookDisabledPayload
  | WebhookEnabledPayload
  | WebhookDeletedPayload
  | DeliveryAttemptedPayload
  | DeliverySucceededPayload
  | DeliveryFailedPayload
  | SecretRotatedPayload;
