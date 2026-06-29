// Maps User domain objects to/from persistence rows with clone-on-write semantics.
import type { User, CreateUser, UpdateUser } from "@veritas/contracts";
import { newId, epochToIso } from "@veritas/core";

/** Persistence row shape for a User. */
export interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly status: "ACTIVE" | "SUSPENDED" | "DELETED";
  readonly lastLoginAt: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to a User domain object. */
export function rowToUser(row: UserRow): User {
  return {
    id: row.id as User["id"],
    email: row.email,
    emailVerified: row.emailVerified,
    name: row.name,
    avatarUrl: row.avatarUrl,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: row.createdAt as User["createdAt"],
    updatedAt: row.updatedAt as User["updatedAt"],
  };
}

/** Convert a CreateUser DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateUser, now: string): UserRow {
  return {
    id: newId("user"),
    email: dto.email,
    emailVerified: false,
    name: dto.name ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    status: "ACTIVE",
    lastLoginAt: null,
    ...(dto.metadata !== undefined ? { metadata: { ...dto.metadata } } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update, returning a new row. */
export function mergeRow(existing: UserRow, patch: UpdateUser, now: string): UserRow {
  return {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name ?? null } : {}),
    ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl ?? null } : {}),
    ...(patch.emailVerified !== undefined ? { emailVerified: patch.emailVerified } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.metadata !== undefined ? { metadata: { ...patch.metadata } } : {}),
    updatedAt: now,
  };
}
