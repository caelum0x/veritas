// Maps IdempotencyKey domain objects to/from persistence rows with clone-on-write semantics.
import type { IdempotencyKey, CreateIdempotencyKey, IdempotencyKeyStatus } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";
import type { UpdateIdempotencyKey } from "../repositories/idempotencyKey.repository.js";

/** Persistence row shape for an IdempotencyKey. */
export interface IdempotencyKeyRow {
  readonly id: string;
  readonly key: string;
  readonly organizationId: string | null;
  readonly method: string;
  readonly path: string;
  readonly requestHash: string;
  readonly status: string;
  readonly responseStatus: number | null;
  readonly responseBody: unknown;
  readonly expiresAt: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Convert a persistence row to an IdempotencyKey domain object. */
export function rowToIdempotencyKey(row: IdempotencyKeyRow): IdempotencyKey {
  return {
    id: row.id as IdempotencyKey["id"],
    key: row.key,
    organizationId: row.organizationId as IdempotencyKey["organizationId"],
    method: row.method,
    path: row.path,
    requestHash: row.requestHash as IdempotencyKey["requestHash"],
    status: row.status as IdempotencyKeyStatus,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    expiresAt: row.expiresAt,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Convert a CreateIdempotencyKey DTO into a persistence row, generating id and timestamps. */
export function createDtoToRow(dto: CreateIdempotencyKey, now: number): IdempotencyKeyRow {
  return {
    id: newId("idm"),
    key: dto.key,
    organizationId: dto.organizationId ?? null,
    method: dto.method,
    path: dto.path,
    requestHash: dto.requestHash,
    status: "IN_PROGRESS",
    responseStatus: null,
    responseBody: null,
    expiresAt: dto.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an UpdateIdempotencyKey patch into an existing row, refreshing updatedAt. */
export function mergeIdempotencyKeyRow(
  existing: IdempotencyKeyRow,
  patch: UpdateIdempotencyKey
): IdempotencyKeyRow {
  return {
    ...existing,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.responseStatus !== undefined ? { responseStatus: patch.responseStatus } : {}),
    ...(patch.responseBody !== undefined ? { responseBody: patch.responseBody } : {}),
    updatedAt: Date.now(),
  };
}

/** Convert an IdempotencyKey domain object back to a persistence row. */
export function idempotencyKeyToRow(k: IdempotencyKey): IdempotencyKeyRow {
  return {
    id: k.id,
    key: k.key,
    organizationId: k.organizationId,
    method: k.method,
    path: k.path,
    requestHash: k.requestHash,
    status: k.status,
    responseStatus: k.responseStatus,
    responseBody: k.responseBody,
    expiresAt: k.expiresAt,
    createdAt: isoToEpoch(k.createdAt) ?? 0,
    updatedAt: isoToEpoch(k.updatedAt) ?? 0,
  };
}
