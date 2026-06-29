// Mapper between Webhook domain objects and persistence row representation.
import { newId } from "@veritas/core";
import type { Webhook, CreateWebhook, UpdateWebhook } from "@veritas/contracts";
import { sha256Hex } from "@veritas/core";

/** Raw persistence row for a Webhook. */
export interface WebhookRow {
  readonly id: string;
  readonly organizationId: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly secret: string;
  readonly active: boolean;
  readonly description: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Generate a webhook signing secret from the id and timestamp. */
function generateSecret(id: string, now: string): string {
  return sha256Hex(`${id}:${now}`);
}

/** Map a persistence row to a Webhook domain object. */
export function rowToWebhook(row: WebhookRow): Webhook {
  return {
    id: row.id as Webhook["id"],
    organizationId: row.organizationId as Webhook["organizationId"],
    url: row.url,
    events: [...row.events],
    secret: row.secret,
    active: row.active,
    description: row.description,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: row.createdAt as Webhook["createdAt"],
    updatedAt: row.updatedAt as Webhook["updatedAt"],
  };
}

/** Map a CreateWebhook DTO + timestamps into a persistence row. */
export function createDtoToRow(dto: CreateWebhook, now: string): WebhookRow {
  const id = newId("whk");
  return {
    id,
    organizationId: dto.organizationId,
    url: dto.url,
    events: [...dto.events],
    secret: generateSecret(id, now),
    active: true,
    description: dto.description ?? null,
    metadata: dto.metadata !== undefined ? { ...dto.metadata } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with an UpdateWebhook patch, returning a new row. */
export function mergeRow(existing: WebhookRow, patch: UpdateWebhook, now: string): WebhookRow {
  return {
    ...existing,
    ...(patch.url !== undefined ? { url: patch.url } : {}),
    ...(patch.events !== undefined ? { events: [...patch.events] } : {}),
    ...(patch.active !== undefined ? { active: patch.active } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    updatedAt: now,
  };
}
