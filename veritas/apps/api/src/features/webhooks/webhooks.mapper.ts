// Maps WebhookOutput and WebhookDeliveryOutput domain objects to HTTP response shapes.
import type { WebhookOutput } from "@veritas/services";
import type { WebhookDeliveryOutput } from "@veritas/services/webhook/webhook.dto.js";
import type { Page } from "@veritas/core";

/** HTTP response shape for a single webhook subscription. */
export interface WebhookResponse {
  readonly id: string;
  readonly organizationId: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly secret: string;
  readonly active: boolean;
  readonly description: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** HTTP response shape for a webhook delivery attempt. */
export interface WebhookDeliveryResponse {
  readonly id: string;
  readonly webhookId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly status: string;
  readonly attempt: number;
  readonly responseStatus: number | null;
  readonly error: string | null;
  readonly payloadHash: string;
  readonly nextRetryAt: string | null;
  readonly deliveredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a domain WebhookOutput to HTTP-safe WebhookResponse. */
export function toWebhookResponse(webhook: WebhookOutput): WebhookResponse {
  return {
    id: webhook.id,
    organizationId: webhook.organizationId,
    url: webhook.url,
    events: webhook.events,
    secret: webhook.secret,
    active: webhook.active,
    description: webhook.description ?? null,
    metadata: webhook.metadata,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}

/** Convert a domain WebhookDeliveryOutput to HTTP-safe WebhookDeliveryResponse. */
export function toWebhookDeliveryResponse(delivery: WebhookDeliveryOutput): WebhookDeliveryResponse {
  return {
    id: delivery.id,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    status: delivery.status,
    attempt: delivery.attempt,
    responseStatus: delivery.responseStatus ?? null,
    error: delivery.error ?? null,
    payloadHash: delivery.payloadHash,
    nextRetryAt: delivery.nextRetryAt ?? null,
    deliveredAt: delivery.deliveredAt ?? null,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

/** Convert a Page<WebhookOutput> to an array of HTTP response shapes. */
export function toWebhookPageItems(page: { items: WebhookOutput[]; nextCursor: string | null; total: number }) {
  return {
    items: page.items.map(toWebhookResponse),
    nextCursor: page.nextCursor,
    total: page.total,
  };
}

/** Convert a Page<WebhookDeliveryOutput> to an array of HTTP response shapes. */
export function toDeliveryPageItems(page: { items: WebhookDeliveryOutput[]; nextCursor: string | null; total: number }) {
  return {
    items: page.items.map(toWebhookDeliveryResponse),
    nextCursor: page.nextCursor,
    total: page.total,
  };
}
