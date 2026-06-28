// Tool permission definitions, checking, and enforcement helpers.

import { z } from "zod";
import { err, ok, type Result } from "@veritas/core";
import { ToolPermissionDeniedError } from "./errors.js";
import type { ToolDescriptor } from "./descriptor.js";
import type { ToolContext } from "./types.js";

/** Built-in permission token constants. */
export const TOOL_PERMISSIONS = {
  READ: "tool:read",
  WRITE: "tool:write",
  ADMIN: "tool:admin",
  EXECUTE: "tool:execute",
  SEARCH: "tool:search",
  REGISTER: "tool:register",
  DEPRECATE: "tool:deprecate",
} as const;

export type BuiltInPermission =
  (typeof TOOL_PERMISSIONS)[keyof typeof TOOL_PERMISSIONS];

export const permissionSchema = z.string().min(1).max(128);
export type Permission = z.infer<typeof permissionSchema>;

/** A set of permissions held by a caller. */
export interface PermissionSet {
  readonly grants: ReadonlySet<string>;
}

export function makePermissionSet(grants: readonly string[]): PermissionSet {
  return { grants: new Set(grants) };
}

export function hasPermission(set: PermissionSet, permission: string): boolean {
  return set.grants.has(TOOL_PERMISSIONS.ADMIN) || set.grants.has(permission);
}

export function hasAllPermissions(
  set: PermissionSet,
  permissions: readonly string[],
): boolean {
  return permissions.every((p) => hasPermission(set, p));
}

/** Check whether a context may invoke the given tool. */
export function checkToolPermissions(
  descriptor: ToolDescriptor,
  context: ToolContext,
): Result<true, ToolPermissionDeniedError> {
  const callerSet = makePermissionSet(context.permissions);
  for (const required of descriptor.requiredPermissions) {
    if (!hasPermission(callerSet, required)) {
      return err(new ToolPermissionDeniedError(descriptor.id, required));
    }
  }
  return ok(true as const);
}

/** Return a filtered list of tools the caller is allowed to see. */
export function filterByPermissions(
  tools: readonly ToolDescriptor[],
  context: ToolContext,
): ToolDescriptor[] {
  const callerSet = makePermissionSet(context.permissions);
  return tools.filter((t) =>
    hasAllPermissions(callerSet, t.requiredPermissions),
  );
}
