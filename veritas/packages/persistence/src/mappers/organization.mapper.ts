// Maps Organization domain objects to/from persistence rows with immutable semantics.

import type { Organization, CreateOrganization, UpdateOrganization } from "@veritas/contracts";
import { newId } from "@veritas/core";

/** Persistence row shape for an Organization. */
export interface OrganizationRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly ownerId: string;
  readonly billingEmail: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to an Organization domain object. */
export function rowToOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id as Organization["id"],
    slug: row.slug,
    name: row.name,
    ownerId: row.ownerId as Organization["ownerId"],
    billingEmail: row.billingEmail,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: row.createdAt as Organization["createdAt"],
    updatedAt: row.updatedAt as Organization["updatedAt"],
  };
}

/** Convert a CreateOrganization DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateOrganization, now: string): OrganizationRow {
  return {
    id: newId("org"),
    slug: dto.slug,
    name: dto.name,
    ownerId: dto.ownerId,
    billingEmail: dto.billingEmail ?? null,
    metadata: dto.metadata !== undefined ? { ...dto.metadata } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update, returning a new row. */
export function mergeRow(
  existing: OrganizationRow,
  patch: UpdateOrganization,
  now: string,
): OrganizationRow {
  return {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.billingEmail !== undefined ? { billingEmail: patch.billingEmail } : {}),
    ...(patch.metadata !== undefined ? { metadata: { ...patch.metadata } } : {}),
    updatedAt: now,
  };
}
