// Order resource permission set for Veritas RBAC.
import { permission, Permission } from "../permission.js";
import {
  RESOURCE_ORDER,
  ACTION_READ,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_APPROVE,
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

export const ORDER_READ: Permission = permission(RESOURCE_ORDER, ACTION_READ);
export const ORDER_CREATE: Permission = permission(RESOURCE_ORDER, ACTION_CREATE);
export const ORDER_UPDATE: Permission = permission(RESOURCE_ORDER, ACTION_UPDATE);
export const ORDER_DELETE: Permission = permission(RESOURCE_ORDER, ACTION_DELETE);
export const ORDER_APPROVE: Permission = permission(RESOURCE_ORDER, ACTION_APPROVE);
export const ORDER_MANAGE: Permission = permission(RESOURCE_ORDER, ACTION_MANAGE);

export const ALL_ORDER_PERMISSIONS: readonly Permission[] = [
  ORDER_READ,
  ORDER_CREATE,
  ORDER_UPDATE,
  ORDER_DELETE,
  ORDER_APPROVE,
  ORDER_MANAGE,
] as const;

/** Default permissions granted per built-in role for the order resource. */
export const ORDER_ROLE_PERMISSIONS: ReadonlyMap<RoleId, readonly Permission[]> = new Map([
  [ROLE_SUPER_ADMIN, ALL_ORDER_PERMISSIONS],
  [ROLE_ORG_OWNER, ALL_ORDER_PERMISSIONS],
  [ROLE_ORG_ADMIN, [ORDER_READ, ORDER_CREATE, ORDER_UPDATE, ORDER_DELETE, ORDER_APPROVE]],
  [ROLE_MEMBER, [ORDER_READ, ORDER_CREATE, ORDER_UPDATE]],
  [ROLE_VIEWER, [ORDER_READ]],
]);
