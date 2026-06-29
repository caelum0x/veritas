// Permission matrix: maps built-in roles to their granted permission sets.
import { permission, Permission } from "./permission.js";
import {
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_MEMBER,
  ROLE_VIEWER,
  ROLE_BILLING_MANAGER,
  ROLE_AGENT_OPERATOR,
  RoleId,
} from "./role.js";
import { Policy } from "./policy.js";

// --- Report permissions ---
const REPORT_READ = permission("report", "read");
const REPORT_CREATE = permission("report", "create");
const REPORT_UPDATE = permission("report", "update");
const REPORT_DELETE = permission("report", "delete");
const REPORT_EXPORT = permission("report", "export");
const REPORT_MANAGE = permission("report", "manage");

// --- Order permissions ---
const ORDER_READ = permission("order", "read");
const ORDER_CREATE = permission("order", "create");
const ORDER_UPDATE = permission("order", "update");
const ORDER_DELETE = permission("order", "delete");
const ORDER_APPROVE = permission("order", "approve");
const ORDER_MANAGE = permission("order", "manage");

// --- Agent permissions ---
const AGENT_READ = permission("agent", "read");
const AGENT_CREATE = permission("agent", "create");
const AGENT_UPDATE = permission("agent", "update");
const AGENT_DELETE = permission("agent", "delete");
const AGENT_EXECUTE = permission("agent", "execute");
const AGENT_MANAGE = permission("agent", "manage");

// --- Billing permissions ---
const BILLING_READ = permission("billing", "read");
const BILLING_UPDATE = permission("billing", "update");
const BILLING_MANAGE = permission("billing", "manage");

// --- Admin permissions ---
const ADMIN_READ = permission("admin", "read");
const ADMIN_MANAGE = permission("admin", "manage");
const MEMBER_MANAGE = permission("member", "manage");
const MEMBER_READ = permission("member", "read");
const WEBHOOK_MANAGE = permission("webhook", "manage");
const API_KEY_MANAGE = permission("api_key", "manage");
const AUDIT_READ = permission("audit", "read");

function makeAllow(
  id: string,
  roleId: RoleId,
  description: string,
  permissions: readonly Permission[]
): Policy {
  return {
    id,
    roleId,
    description,
    rules: permissions.map((p) => ({ effect: "allow" as const, permission: p })),
  };
}

/** Full permission matrix for all built-in roles. */
export const PERMISSION_MATRIX: readonly Policy[] = [
  makeAllow(
    "policy:viewer",
    ROLE_VIEWER,
    "Viewer read-only access.",
    [REPORT_READ, ORDER_READ, AGENT_READ, MEMBER_READ]
  ),
  makeAllow(
    "policy:member",
    ROLE_MEMBER,
    "Member can create and manage own orders and reports.",
    [REPORT_CREATE, REPORT_UPDATE, REPORT_EXPORT, ORDER_CREATE, ORDER_UPDATE]
  ),
  makeAllow(
    "policy:billing_manager",
    ROLE_BILLING_MANAGER,
    "Billing manager handles invoices and subscriptions.",
    [BILLING_READ, BILLING_UPDATE, BILLING_MANAGE]
  ),
  makeAllow(
    "policy:agent_operator",
    ROLE_AGENT_OPERATOR,
    "Agent operator deploys and runs agents.",
    [AGENT_CREATE, AGENT_UPDATE, AGENT_EXECUTE, AGENT_MANAGE]
  ),
  makeAllow(
    "policy:org_admin",
    ROLE_ORG_ADMIN,
    "Org admin manages members, webhooks, and api keys.",
    [
      REPORT_MANAGE, REPORT_DELETE,
      ORDER_APPROVE, ORDER_MANAGE, ORDER_DELETE,
      AGENT_DELETE,
      MEMBER_MANAGE, MEMBER_READ,
      WEBHOOK_MANAGE, API_KEY_MANAGE,
      BILLING_READ, AUDIT_READ,
    ]
  ),
  makeAllow(
    "policy:org_owner",
    ROLE_ORG_OWNER,
    "Org owner has full billing and admin control.",
    [BILLING_MANAGE, ADMIN_READ]
  ),
  makeAllow(
    "policy:super_admin",
    ROLE_SUPER_ADMIN,
    "Super admin has full platform access.",
    [ADMIN_READ, ADMIN_MANAGE, permission("*", "*")]
  ),
];

/** Look up the effective permissions for a given role (direct, not inherited). */
export function getDirectPermissions(roleId: RoleId): readonly Permission[] {
  return PERMISSION_MATRIX
    .filter((p) => p.roleId === roleId)
    .flatMap((p) => p.rules.filter((r) => r.effect === "allow").map((r) => r.permission));
}

/** Build policies map keyed by role id. */
export const PERMISSION_MATRIX_BY_ROLE: ReadonlyMap<RoleId, Policy> = new Map(
  PERMISSION_MATRIX.map((p) => [p.roleId, p])
);
