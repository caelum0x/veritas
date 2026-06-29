// Maps @veritas/rbac Role domain objects to HTTP response shapes.
import type { Role, RoleId } from "@veritas/rbac";
import { unroleId, resolveInheritedRoles, getDirectPermissions, BUILT_IN_ROLE_MAP } from "@veritas/rbac";

export interface RoleResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inherits: readonly string[];
  readonly directPermissions: readonly string[];
  readonly effectiveRoles: readonly string[];
}

/** Convert an RBAC Role to a serializable HTTP response object. */
export function toRoleResponse(role: Role): RoleResponse {
  const directPermissions = getDirectPermissions(role.id).map(String);
  const effectiveRoles = Array.from(resolveInheritedRoles(role.id, BUILT_IN_ROLE_MAP)).map(
    (rid: RoleId) => unroleId(rid),
  );

  return Object.freeze({
    id: unroleId(role.id),
    name: role.name,
    description: role.description,
    inherits: role.inherits.map((rid) => unroleId(rid)),
    directPermissions,
    effectiveRoles,
  });
}

/** Map an array of Roles to response objects. */
export function toRoleResponseList(roles: ReadonlyArray<Role>): readonly RoleResponse[] {
  return Object.freeze(roles.map(toRoleResponse));
}
