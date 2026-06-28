// Maps Usage domain objects to/from persistence rows with immutable clone-on-write semantics.
import type { Usage, CreateUsage, UsageMetric } from "@veritas/contracts";
import { newId, epochToIso } from "@veritas/core";

/** Persistence row shape for a Usage record. */
export interface UsageRow {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly metric: string;
  readonly quantity: number;
  readonly recordedAt: string;
  readonly idempotencyKey: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row into a Usage domain object. */
export function rowToUsage(row: UsageRow): Usage {
  return {
    id: row.id as Usage["id"],
    organizationId: row.organizationId as Usage["organizationId"],
    subscriptionId: row.subscriptionId as Usage["subscriptionId"],
    metric: row.metric as UsageMetric,
    quantity: row.quantity,
    recordedAt: row.recordedAt,
    idempotencyKey: row.idempotencyKey,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: row.createdAt as Usage["createdAt"],
    updatedAt: row.updatedAt as Usage["updatedAt"],
  } as Usage;
}

/** Convert a CreateUsage DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateUsage, now: string): UsageRow {
  const id = newId("usg");
  return {
    id,
    organizationId: dto.organizationId,
    subscriptionId: dto.subscriptionId ?? null,
    metric: dto.metric,
    quantity: dto.quantity,
    recordedAt: now,
    idempotencyKey: dto.idempotencyKey ?? null,
    ...(dto.metadata !== undefined ? { metadata: { ...dto.metadata } } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial UpdateUsage patch, returning a new row. */
export function mergeRow(existing: UsageRow, patch: Partial<CreateUsage>, now: string): UsageRow {
  return {
    ...existing,
    ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
    ...(patch.subscriptionId !== undefined ? { subscriptionId: patch.subscriptionId ?? null } : {}),
    ...(patch.idempotencyKey !== undefined ? { idempotencyKey: patch.idempotencyKey ?? null } : {}),
    ...(patch.metadata !== undefined ? { metadata: { ...patch.metadata } } : {}),
    updatedAt: now,
  };
}
