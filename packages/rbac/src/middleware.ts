// Express RBAC middleware: enforces permission checks on incoming requests.

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError } from "@veritas/core";
import type { Principal } from "@veritas/auth";
import type { EnforcerOptions } from "./enforcer.js";
import { evaluate } from "./enforcer.js";
import type { Permission } from "./permission.js";
import { rawPermission } from "./permission.js";
import type { ResourceDescriptor } from "./resource.js";
import { makeResource, WILDCARD_RESOURCE } from "./resource.js";
import type { ResourceType } from "./resource.js";
import { makeSubject } from "./subject.js";
import type { AuthzAuditHook } from "./audit.js";
import { makeAuditEntry } from "./audit.js";
import type { UserId } from "@veritas/core";
import { asId } from "@veritas/core";

/** Symbol key used to attach the resolved principal to Express request. */
export const PRINCIPAL_KEY = Symbol("veritas.principal");

/** Augment Express Request to carry the authenticated principal. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      [PRINCIPAL_KEY]?: Principal;
    }
  }
}

export interface RbacMiddlewareOptions {
  /** Required permission string, e.g. "report:read". */
  readonly permission: string;
  /** Resource type for this route, e.g. "report". */
  readonly resourceType: ResourceType;
  /** Enforcer options containing loaded policies. */
  readonly enforcer: EnforcerOptions;
  /** Optional audit hook called after each evaluation. */
  readonly audit?: AuthzAuditHook;
  /** Optional: extract resource id from request (defaults to req.params.id). */
  readonly getResourceId?: (req: Request) => string | undefined;
  /** Optional: extract org id from request (defaults to principal.orgId). */
  readonly getOrgId?: (req: Request, principal: Principal) => string;
}

/** Retrieve the principal attached to a request (throws if missing). */
export function getPrincipal(req: Request): Principal {
  const principal = req[PRINCIPAL_KEY];
  if (principal === undefined) {
    throw new UnauthorizedError({ message: "No authenticated principal on request." });
  }
  return principal;
}

/** Attach a principal to a request (used by auth middleware upstream). */
export function setPrincipal(req: Request, principal: Principal): void {
  req[PRINCIPAL_KEY] = principal;
}

/**
 * Express middleware factory that enforces an RBAC permission check.
 * Expects the principal to have been attached by upstream auth middleware
 * via setPrincipal(). Returns 401 if no principal, 403 if denied.
 */
export function rbacMiddleware(opts: RbacMiddlewareOptions): RequestHandler {
  const perm: Permission = rawPermission(opts.permission);

  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = req[PRINCIPAL_KEY];
    if (principal === undefined) {
      next(new UnauthorizedError({ message: "Authentication required." }));
      return;
    }

    const orgId = opts.getOrgId
      ? opts.getOrgId(req, principal)
      : principal.orgId;

    const resourceId = opts.getResourceId
      ? opts.getResourceId(req)
      : (req.params["id"] as string | undefined);

    const resource: ResourceDescriptor = makeResource(
      opts.resourceType,
      resourceId,
      orgId,
    );

    const subject = makeSubject(
      asId(principal.userId ?? principal.id, "user"),
      orgId,
      // Use principal's scopes as role identifiers when no explicit roles exist.
      principal.scopes.map(String),
    );

    const result = evaluate({ subject, permission: perm, resource }, opts.enforcer);

    if (!result.ok) {
      next(result.error);
      return;
    }

    const decision = result.value.decision === "allow" ? "ALLOW" : "DENY";
    const reason = result.value.reason;

    if (opts.audit) {
      opts.audit(makeAuditEntry(subject, perm, resource, decision, reason));
    }

    if (decision === "DENY") {
      next(new ForbiddenError({ message: `Permission denied: ${opts.permission}` }));
      return;
    }

    next();
  };
}

/**
 * Compose multiple RBAC middleware handlers (ALL must pass).
 * Short-circuits on first denial.
 */
export function requireAll(...handlers: RequestHandler[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let idx = 0;

    const step = (err?: unknown): void => {
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }
      const handler = handlers[idx++];
      if (handler === undefined) {
        next();
        return;
      }
      handler(req, res, step);
    };

    step();
  };
}

/**
 * Build a resource descriptor extractor that reads the org id from a
 * request header (X-Veritas-Org-Id) or falls back to the principal.
 */
export function orgIdFromHeader(headerName = "x-veritas-org-id") {
  return (req: Request, principal: Principal): string =>
    (req.headers[headerName] as string | undefined) ?? principal.orgId;
}
