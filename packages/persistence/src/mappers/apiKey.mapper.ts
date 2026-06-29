// Maps ApiKey domain objects to/from persistence rows with clone-on-write semantics.

import type { ApiKey, CreateApiKey } from "@veritas/contracts";
import { newId, epochToIso } from "@veritas/core";

/** Persistence row shape for an ApiKey. */
export interface ApiKeyRow {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string | null;
  readonly name: string;
  readonly prefix: string;
  readonly hashedKey: string;
  readonly scopes: readonly string[];
  readonly lastUsedAt: string | null;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to an ApiKey domain object. */
export function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id as ApiKey["id"],
    organizationId: row.organizationId as ApiKey["organizationId"],
    userId: (row.userId ?? null) as ApiKey["userId"],
    name: row.name,
    prefix: row.prefix,
    hashedKey: row.hashedKey,
    scopes: [...row.scopes],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt as ApiKey["createdAt"],
    updatedAt: row.updatedAt as ApiKey["updatedAt"],
  };
}

/** Convert a CreateApiKey DTO + generated fields into a persistence row. */
export function createDtoToRow(
  dto: CreateApiKey,
  prefix: string,
  hashedKey: string,
  now: string,
): ApiKeyRow {
  const id = newId("key");
  return {
    id,
    organizationId: dto.organizationId,
    userId: dto.userId ?? null,
    name: dto.name,
    prefix,
    hashedKey,
    scopes: dto.scopes !== undefined ? [...dto.scopes] : [],
    lastUsedAt: null,
    expiresAt: dto.expiresAt ?? null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update DTO, returning a new row. */
export function mergeRow(
  existing: ApiKeyRow,
  patch: Partial<CreateApiKey>,
  now: string,
): ApiKeyRow {
  return {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.scopes !== undefined ? { scopes: [...patch.scopes] } : {}),
    ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt ?? null } : {}),
    updatedAt: now,
  };
}

/** Mark the key as used right now, returning an updated row. */
export function markUsed(existing: ApiKeyRow, now: string): ApiKeyRow {
  return { ...existing, lastUsedAt: now, updatedAt: now };
}

/** Mark the key as revoked, returning an updated row. */
export function markRevoked(existing: ApiKeyRow, now: string): ApiKeyRow {
  return { ...existing, revokedAt: now, updatedAt: now };
}
