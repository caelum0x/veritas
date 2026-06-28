// AuthzSubject: identity carrying userId, orgId, and resolved roles for policy evaluation.

import { UserId } from "@veritas/core";

/** Resolved roles held by a subject within an org context. */
export interface AuthzSubject {
  readonly userId: UserId;
  readonly orgId: string;
  readonly roles: ReadonlyArray<string>;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** Construct an AuthzSubject from parts. */
export function makeSubject(
  userId: UserId,
  orgId: string,
  roles: ReadonlyArray<string>,
  attributes: Readonly<Record<string, unknown>> = {},
): AuthzSubject {
  return Object.freeze({ userId, orgId, roles: [...roles], attributes });
}

/** Check if a subject holds a specific role. */
export function subjectHasRole(subject: AuthzSubject, role: string): boolean {
  return subject.roles.includes(role);
}

/** Merge additional attributes into a subject (returns new subject). */
export function withAttributes(
  subject: AuthzSubject,
  extra: Readonly<Record<string, unknown>>,
): AuthzSubject {
  return Object.freeze({
    ...subject,
    attributes: Object.freeze({ ...subject.attributes, ...extra }),
  });
}
