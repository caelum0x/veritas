// Role definitions and built-in role hierarchy for Veritas RBAC.
import { Brand, brand, unbrand } from "@veritas/core";

export type RoleId = Brand<string, "RoleId">;

export const roleId = (value: string): RoleId => brand<string, "RoleId">(value);
export const unroleId = (id: RoleId): string => unbrand(id);

export interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly inherits: readonly RoleId[];
}

export const ROLE_SUPER_ADMIN = roleId("super_admin");
export const ROLE_ORG_OWNER = roleId("org_owner");
export const ROLE_ORG_ADMIN = roleId("org_admin");
export const ROLE_MEMBER = roleId("member");
export const ROLE_VIEWER = roleId("viewer");
export const ROLE_BILLING_MANAGER = roleId("billing_manager");
export const ROLE_AGENT_OPERATOR = roleId("agent_operator");

export const BUILT_IN_ROLES: readonly Role[] = [
  {
    id: ROLE_SUPER_ADMIN,
    name: "Super Admin",
    description: "Full platform access across all organizations.",
    inherits: [],
  },
  {
    id: ROLE_ORG_OWNER,
    name: "Organization Owner",
    description: "Full control over a single organization.",
    inherits: [ROLE_ORG_ADMIN],
  },
  {
    id: ROLE_ORG_ADMIN,
    name: "Organization Admin",
    description: "Manages members, settings, and resources within an org.",
    inherits: [ROLE_MEMBER],
  },
  {
    id: ROLE_MEMBER,
    name: "Member",
    description: "Can create and manage own claims and orders.",
    inherits: [ROLE_VIEWER],
  },
  {
    id: ROLE_VIEWER,
    name: "Viewer",
    description: "Read-only access to permitted resources.",
    inherits: [],
  },
  {
    id: ROLE_BILLING_MANAGER,
    name: "Billing Manager",
    description: "Manages billing, invoices, and subscriptions.",
    inherits: [ROLE_VIEWER],
  },
  {
    id: ROLE_AGENT_OPERATOR,
    name: "Agent Operator",
    description: "Can deploy, configure, and monitor agents.",
    inherits: [ROLE_VIEWER],
  },
] as const;

export const BUILT_IN_ROLE_MAP: ReadonlyMap<RoleId, Role> = new Map(
  BUILT_IN_ROLES.map((r) => [r.id, r])
);

/** Resolve transitive role inheritance. Returns set of all effective role IDs. */
export function resolveInheritedRoles(
  rootId: RoleId,
  roleMap: ReadonlyMap<RoleId, Role> = BUILT_IN_ROLE_MAP
): ReadonlySet<RoleId> {
  const visited = new Set<RoleId>();
  const stack: RoleId[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const role = roleMap.get(current);
    if (role) {
      for (const parent of role.inherits) {
        stack.push(parent);
      }
    }
  }
  return visited;
}
