// Admin resource permission set for Veritas RBAC.
import { permission, Permission } from "../permission.js";
import {
  RESOURCE_ADMIN,
  RESOURCE_AUDIT,
  RESOURCE_MEMBER,
  ACTION_READ,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_MANAGE,
  ACTION_WILDCARD,
} from "../permission.js";
import {
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_VIEWER,
  RoleId,
} from "../role.js";

export const ADMIN_MANAGE: Permission = permission(RESOURCE_ADMIN, ACTION_MANAGE);
export const ADMIN_WILDCARD: Permission = permission(RESOURCE_ADMIN, ACTION_WILDCARD);

export const AUDIT_READ: Permission = permission(RESOURCE_AUDIT, ACTION_READ);
export const AUDIT_MANAGE: Permission = permission(RESOURCE_AUDIT, ACTION_MANAGE);

export const MEMBER_READ: Permission = permission(RESOURCE_MEMBER, ACTION_READ);
export const MEMBER_CREATE: Permission = permission(RESOURCE_MEMBER, ACTION_CREATE);
export const MEMBER_UPDATE: Permission = permission(RESOURCE_MEMBER, ACTION_UPDATE);
export const MEMBER_DELETE: Permission = permission(RESOURCE_MEMBER, ACTION_DELETE);
export const MEMBER_MANAGE: Permission = permission(RESOURCE_MEMBER, ACTION_MANAGE);

export const ALL_ADMIN_PERMISSIONS: readonly Permission[] = [
  ADMIN_MANAGE,
  ADMIN_WILDCARD,
  AUDIT_READ,
  AUDIT_MANAGE,
  MEMBER_READ,
  MEMBER_CREATE,
  MEMBER_UPDATE,
  MEMBER_DELETE,
  MEMBER_MANAGE,
] as const;

/** Default permissions granted per built-in role for admin/audit/member resources. */
export const ADMIN_ROLE_PERMISSIONS: ReadonlyMap<RoleId, readonly Permission[]> = new Map([
  [ROLE_SUPER_ADMIN, ALL_ADMIN_PERMISSIONS],
  [ROLE_ORG_OWNER, [AUDIT_READ, AUDIT_MANAGE, MEMBER_READ, MEMBER_CREATE, MEMBER_UPDATE, MEMBER_DELETE, MEMBER_MANAGE]],
  [ROLE_ORG_ADMIN, [AUDIT_READ, MEMBER_READ, MEMBER_CREATE, MEMBER_UPDATE, MEMBER_DELETE]],
  [ROLE_VIEWER, [AUDIT_READ, MEMBER_READ]],
]);
