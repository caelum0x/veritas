// Maps Membership domain objects to/from persistence rows with immutable semantics.

import type { Membership, CreateMembership, UpdateMembership, MembershipRole } from "@veritas/contracts";
import { newId } from "@veritas/core";

/** Persistence row shape for a Membership. */
export interface MembershipRow {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly role: MembershipRole;
  readonly invitedBy: string | null;
  readonly acceptedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to a Membership domain object. */
export function rowToMembership(row: MembershipRow): Membership {
  return {
    id: row.id as Membership["id"],
    organizationId: row.organizationId as Membership["organizationId"],
    userId: row.userId as Membership["userId"],
    role: row.role,
    invitedBy: row.invitedBy as Membership["invitedBy"],
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt as Membership["createdAt"],
    updatedAt: row.updatedAt as Membership["updatedAt"],
  };
}

/** Convert a CreateMembership DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateMembership, now: string): MembershipRow {
  return {
    id: newId("mbr"),
    organizationId: dto.organizationId,
    userId: dto.userId,
    role: dto.role,
    invitedBy: dto.invitedBy ?? null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update, returning a new row. */
export function mergeRow(
  existing: MembershipRow,
  patch: UpdateMembership,
  now: string,
): MembershipRow {
  return {
    ...existing,
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.acceptedAt !== undefined ? { acceptedAt: patch.acceptedAt } : {}),
    updatedAt: now,
  };
}
