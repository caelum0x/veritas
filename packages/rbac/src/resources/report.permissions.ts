// Report resource permission set for Veritas RBAC.
import { permission, Permission } from "../permission.js";
import {
  RESOURCE_REPORT,
  ACTION_READ,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_EXPORT,
  ACTION_MANAGE,
} from "../permission.js";
import {
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_MEMBER,
  ROLE_VIEWER,
  RoleId,
} from "../role.js";

export const REPORT_READ: Permission = permission(RESOURCE_REPORT, ACTION_READ);
export const REPORT_CREATE: Permission = permission(RESOURCE_REPORT, ACTION_CREATE);
export const REPORT_UPDATE: Permission = permission(RESOURCE_REPORT, ACTION_UPDATE);
export const REPORT_DELETE: Permission = permission(RESOURCE_REPORT, ACTION_DELETE);
export const REPORT_EXPORT: Permission = permission(RESOURCE_REPORT, ACTION_EXPORT);
export const REPORT_MANAGE: Permission = permission(RESOURCE_REPORT, ACTION_MANAGE);

export const ALL_REPORT_PERMISSIONS: readonly Permission[] = [
  REPORT_READ,
  REPORT_CREATE,
  REPORT_UPDATE,
  REPORT_DELETE,
  REPORT_EXPORT,
  REPORT_MANAGE,
] as const;

/** Default permissions granted per built-in role for the report resource. */
export const REPORT_ROLE_PERMISSIONS: ReadonlyMap<RoleId, readonly Permission[]> = new Map([
  [ROLE_SUPER_ADMIN, ALL_REPORT_PERMISSIONS],
  [ROLE_ORG_OWNER, ALL_REPORT_PERMISSIONS],
  [ROLE_ORG_ADMIN, [REPORT_READ, REPORT_CREATE, REPORT_UPDATE, REPORT_DELETE, REPORT_EXPORT]],
  [ROLE_MEMBER, [REPORT_READ, REPORT_CREATE, REPORT_UPDATE, REPORT_EXPORT]],
  [ROLE_VIEWER, [REPORT_READ]],
]);
