// Authorization audit hook: records every policy evaluation decision.

import type { IsoTimestamp, Logger } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { AuthzSubject } from "./subject.js";
import type { ResourceDescriptor } from "./resource.js";
import type { Permission } from "./permission.js";
import { unPermission } from "./permission.js";

export type AuthzDecision = "ALLOW" | "DENY";

/** Immutable record of a single authorization evaluation. */
export interface AuthzAuditEntry {
  readonly at: IsoTimestamp;
  readonly subjectId: string;
  readonly orgId: string;
  readonly roles: ReadonlyArray<string>;
  readonly permission: string;
  readonly resourceType: string;
  readonly resourceId: string | undefined;
  readonly decision: AuthzDecision;
  readonly reason: string;
}

/** Hook called after every policy evaluation. */
export type AuthzAuditHook = (entry: AuthzAuditEntry) => void;

/** Build an audit entry from evaluation context. */
export function makeAuditEntry(
  subject: AuthzSubject,
  perm: Permission,
  resource: ResourceDescriptor,
  decision: AuthzDecision,
  reason: string,
): AuthzAuditEntry {
  return Object.freeze({
    at: epochToIso(Date.now()),
    subjectId: subject.userId,
    orgId: subject.orgId,
    roles: [...subject.roles],
    permission: unPermission(perm),
    resourceType: resource.type,
    resourceId: resource.id,
    decision,
    reason,
  });
}

/** Audit hook that logs entries via a Logger instance. */
export function createLoggingAuditHook(logger: Logger): AuthzAuditHook {
  return (entry: AuthzAuditEntry): void => {
    logger.info("authz.decision", {
      at: entry.at,
      subjectId: entry.subjectId,
      orgId: entry.orgId,
      permission: entry.permission,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      decision: entry.decision,
      reason: entry.reason,
    });
  };
}

/** Audit hook that accumulates entries in memory (useful for testing). */
export class InMemoryAuditLog {
  private readonly entries: AuthzAuditEntry[] = [];

  readonly hook: AuthzAuditHook = (entry: AuthzAuditEntry): void => {
    this.entries.push(entry);
  };

  snapshot(): ReadonlyArray<AuthzAuditEntry> {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }
}

/** Compose multiple audit hooks into a single hook. */
export function composeAuditHooks(...hooks: AuthzAuditHook[]): AuthzAuditHook {
  return (entry: AuthzAuditEntry): void => {
    for (const hook of hooks) {
      hook(entry);
    }
  };
}
