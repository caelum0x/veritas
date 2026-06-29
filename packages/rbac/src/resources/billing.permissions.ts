// Billing resource permission set for Veritas RBAC.
import { permission, Permission } from "../permission.js";
import {
  RESOURCE_BILLING,
  ACTION_READ,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_MANAGE,
} from "../permission.js";
import {
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_BILLING_MANAGER,
  ROLE_VIEWER,
  RoleId,
} from "../role.js";

export const BILLING_READ: Permission = permission(RESOURCE_BILLING, ACTION_READ);
export const BILLING_CREATE: Permission = permission(RESOURCE_BILLING, ACTION_CREATE);
export const BILLING_UPDATE: Permission = permission(RESOURCE_BILLING, ACTION_UPDATE);
export const BILLING_DELETE: Permission = permission(RESOURCE_BILLING, ACTION_DELETE);
export const BILLING_MANAGE: Permission = permission(RESOURCE_BILLING, ACTION_MANAGE);

export const ALL_BILLING_PERMISSIONS: readonly Permission[] = [
  BILLING_READ,
  BILLING_CREATE,
  BILLING_UPDATE,
  BILLING_DELETE,
  BILLING_MANAGE,
] as const;

/** Default permissions granted per built-in role for the billing resource. */
export const BILLING_ROLE_PERMISSIONS: ReadonlyMap<RoleId, readonly Permission[]> = new Map([
  [ROLE_SUPER_ADMIN, ALL_BILLING_PERMISSIONS],
  [ROLE_ORG_OWNER, ALL_BILLING_PERMISSIONS],
  [ROLE_ORG_ADMIN, [BILLING_READ, BILLING_CREATE, BILLING_UPDATE]],
  [ROLE_BILLING_MANAGER, [BILLING_READ, BILLING_CREATE, BILLING_UPDATE, BILLING_DELETE]],
  [ROLE_VIEWER, [BILLING_READ]],
]);
