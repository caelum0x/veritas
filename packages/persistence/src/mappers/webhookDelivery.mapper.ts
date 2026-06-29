// Maps WebhookDelivery domain objects to/from persistence rows with immutable semantics.
import type { WebhookDelivery, CreateWebhookDelivery } from "@veritas/contracts";
import { newId } from "@veritas/core";

/** Persistence row shape for a WebhookDelivery. */
export interface WebhookDeliveryRow {
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

/** Convert a persistence row into a WebhookDelivery domain object. */
export function rowToWebhookDelivery(row: WebhookDeliveryRow): WebhookDelivery {
  return {
    id: row.id as WebhookDelivery["id"],
    webhookId: row.webhookId as WebhookDelivery["webhookId"],
    eventId: row.eventId as WebhookDelivery["eventId"],
    eventType: row.eventType,
    status: row.status as WebhookDelivery["status"],
    attempt: row.attempt,
    responseStatus: row.responseStatus,
    error: row.error,
    payloadHash: row.payloadHash,
    nextRetryAt: row.nextRetryAt,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt as WebhookDelivery["createdAt"],
    updatedAt: row.updatedAt as WebhookDelivery["updatedAt"],
  };
}

/** Convert a CreateWebhookDelivery DTO into a new persistence row. */
export function createDtoToRow(dto: CreateWebhookDelivery, now: string): WebhookDeliveryRow {
  return {
    id: newId("whd"),
    webhookId: dto.webhookId,
    eventId: dto.eventId,
    eventType: dto.eventType,
    status: "PENDING",
    attempt: 0,
    responseStatus: null,
    error: null,
    payloadHash: dto.payloadHash,
    nextRetryAt: null,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update patch, returning a new row. */
export function mergeRow(
  existing: WebhookDeliveryRow,
  patch: Partial<Omit<WebhookDelivery, "id" | "createdAt" | "updatedAt">>,
  now: string
): WebhookDeliveryRow {
  return {
    ...existing,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.attempt !== undefined ? { attempt: patch.attempt } : {}),
    ...(patch.responseStatus !== undefined ? { responseStatus: patch.responseStatus } : {}),
    ...(patch.error !== undefined ? { error: patch.error } : {}),
    ...(patch.nextRetryAt !== undefined ? { nextRetryAt: patch.nextRetryAt } : {}),
    ...(patch.deliveredAt !== undefined ? { deliveredAt: patch.deliveredAt } : {}),
    updatedAt: now,
  };
}
