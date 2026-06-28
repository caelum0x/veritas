// requirePermission helpers: HOF and decorator factory for permission-gated functions.

import { ForbiddenError } from "@veritas/core";
import type { AuthzSubject } from "./subject.js";
import type { ResourceDescriptor } from "./resource.js";

/** A minimal enforcer interface so decorators don't depend on the full enforcer module. */
export interface PermissionEnforcer {
  isAllowed(
    subject: AuthzSubject,
    permission: string,
    resource: ResourceDescriptor,
  ): boolean;
}

/** Context passed to a permission-gated function. */
export interface PermissionContext {
  readonly subject: AuthzSubject;
  readonly resource: ResourceDescriptor;
}

/**
 * Wrap an async function so it throws ForbiddenError if the enforcer denies
 * the given permission before the inner function executes.
 */
export function requirePermission<TArgs extends unknown[], TReturn>(
  enforcer: PermissionEnforcer,
  permission: string,
  getContext: (...args: TArgs) => PermissionContext,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const ctx = getContext(...args);
    if (!enforcer.isAllowed(ctx.subject, permission, ctx.resource)) {
      throw new ForbiddenError({ message: `Permission denied: ${permission}` });
    }
    return fn(...args);
  };
}

/**
 * Wrap a synchronous function so it throws ForbiddenError if the enforcer
 * denies the given permission.
 */
export function requirePermissionSync<TArgs extends unknown[], TReturn>(
  enforcer: PermissionEnforcer,
  permission: string,
  getContext: (...args: TArgs) => PermissionContext,
  fn: (...args: TArgs) => TReturn,
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    const ctx = getContext(...args);
    if (!enforcer.isAllowed(ctx.subject, permission, ctx.resource)) {
      throw new ForbiddenError({ message: `Permission denied: ${permission}` });
    }
    return fn(...args);
  };
}

/**
 * Guard that checks multiple permissions (ALL must be allowed).
 * Throws ForbiddenError on first denied permission.
 */
export function requireAllPermissions<TArgs extends unknown[], TReturn>(
  enforcer: PermissionEnforcer,
  permissions: ReadonlyArray<string>,
  getContext: (...args: TArgs) => PermissionContext,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const ctx = getContext(...args);
    for (const permission of permissions) {
      if (!enforcer.isAllowed(ctx.subject, permission, ctx.resource)) {
        throw new ForbiddenError({ message: `Permission denied: ${permission}` });
      }
    }
    return fn(...args);
  };
}

/**
 * Guard that checks multiple permissions (ANY is sufficient).
 * Throws ForbiddenError only if all are denied.
 */
export function requireAnyPermission<TArgs extends unknown[], TReturn>(
  enforcer: PermissionEnforcer,
  permissions: ReadonlyArray<string>,
  getContext: (...args: TArgs) => PermissionContext,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const ctx = getContext(...args);
    const allowed = permissions.some((p) =>
      enforcer.isAllowed(ctx.subject, p, ctx.resource),
    );
    if (!allowed) {
      throw new ForbiddenError({
        message: `Permission denied: requires one of [${permissions.join(", ")}]`,
      });
    }
    return fn(...args);
  };
}
