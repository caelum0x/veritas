// Agent resource permission set for Veritas RBAC.
import { permission, Permission } from "../permission.js";
import {
  RESOURCE_AGENT,
  ACTION_READ,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_EXECUTE,
  ACTION_MANAGE,
} from "../permission.js";
import {
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_MEMBER,
  ROLE_VIEWER,
  ROLE_AGENT_OPERATOR,
  RoleId,
} from "../role.js";

export const AGENT_READ: Permission = permission(RESOURCE_AGENT, ACTION_READ);
export const AGENT_CREATE: Permission = permission(RESOURCE_AGENT, ACTION_CREATE);
export const AGENT_UPDATE: Permission = permission(RESOURCE_AGENT, ACTION_UPDATE);
export const AGENT_DELETE: Permission = permission(RESOURCE_AGENT, ACTION_DELETE);
export const AGENT_EXECUTE: Permission = permission(RESOURCE_AGENT, ACTION_EXECUTE);
export const AGENT_MANAGE: Permission = permission(RESOURCE_AGENT, ACTION_MANAGE);

export const ALL_AGENT_PERMISSIONS: readonly Permission[] = [
  AGENT_READ,
  AGENT_CREATE,
  AGENT_UPDATE,
  AGENT_DELETE,
  AGENT_EXECUTE,
  AGENT_MANAGE,
] as const;

/** Default permissions granted per built-in role for the agent resource. */
export const AGENT_ROLE_PERMISSIONS: ReadonlyMap<RoleId, readonly Permission[]> = new Map([
  [ROLE_SUPER_ADMIN, ALL_AGENT_PERMISSIONS],
  [ROLE_ORG_OWNER, ALL_AGENT_PERMISSIONS],
  [ROLE_ORG_ADMIN, [AGENT_READ, AGENT_CREATE, AGENT_UPDATE, AGENT_DELETE, AGENT_EXECUTE]],
  [ROLE_AGENT_OPERATOR, [AGENT_READ, AGENT_CREATE, AGENT_UPDATE, AGENT_EXECUTE]],
  [ROLE_MEMBER, [AGENT_READ, AGENT_EXECUTE]],
  [ROLE_VIEWER, [AGENT_READ]],
]);
