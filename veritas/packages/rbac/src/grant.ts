// Grant/revoke helpers: immutable operations on role assignment records.

import { UserId, newId } from "@veritas/core";

/** A single role grant binding a user to a role within an org. */
export interface RoleGrant {
  readonly id: string;
  readonly userId: UserId;
  readonly orgId: string;
  readonly role: string;
  readonly grantedBy: UserId;
  readonly grantedAt: string;
  readonly expiresAt?: string;
}

/** Input for creating a new grant. */
export interface CreateRoleGrant {
  readonly userId: UserId;
  readonly orgId: string;
  readonly role: string;
  readonly grantedBy: UserId;
  readonly expiresAt?: string;
}

/** Create a new RoleGrant record (immutable). */
export function makeGrant(input: CreateRoleGrant): RoleGrant {
  return Object.freeze({
    id: newId("grant"),
    userId: input.userId,
    orgId: input.orgId,
    role: input.role,
    grantedBy: input.grantedBy,
    grantedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  });
}

/** Check if a grant is currently active (not expired). */
export function isGrantActive(grant: RoleGrant, now: Date = new Date()): boolean {
  if (!grant.expiresAt) return true;
  return new Date(grant.expiresAt) > now;
}

/**
 * Add a grant to an immutable list, replacing any existing grant for the
 * same user+org+role combination.
 */
export function addGrant(
  grants: ReadonlyArray<RoleGrant>,
  newGrant: RoleGrant,
): ReadonlyArray<RoleGrant> {
  const filtered = grants.filter(
    (g) =>
      !(g.userId === newGrant.userId &&
        g.orgId === newGrant.orgId &&
        g.role === newGrant.role),
  );
  return Object.freeze([...filtered, newGrant]);
}

/**
 * Remove all grants for a specific user+org+role combination.
 * Returns a new array (immutable).
 */
export function revokeGrant(
  grants: ReadonlyArray<RoleGrant>,
  userId: UserId,
  orgId: string,
  role: string,
): ReadonlyArray<RoleGrant> {
  return Object.freeze(
    grants.filter(
      (g) => !(g.userId === userId && g.orgId === orgId && g.role === role),
    ),
  );
}

/** Collect active roles for a user within an org from a grant list. */
export function activeRolesForUser(
  grants: ReadonlyArray<RoleGrant>,
  userId: UserId,
  orgId: string,
  now: Date = new Date(),
): ReadonlyArray<string> {
  return Object.freeze(
    grants
      .filter((g) => g.userId === userId && g.orgId === orgId && isGrantActive(g, now))
      .map((g) => g.role),
  );
}
