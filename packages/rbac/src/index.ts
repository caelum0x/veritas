// Public re-exports for @veritas/rbac package.

// Role definitions and built-in hierarchy
export type { Role, RoleId } from "./role.js";
export {
  roleId,
  unroleId,
  ROLE_SUPER_ADMIN,
  ROLE_ORG_OWNER,
  ROLE_ORG_ADMIN,
  ROLE_MEMBER,
  ROLE_VIEWER,
  ROLE_BILLING_MANAGER,
  ROLE_AGENT_OPERATOR,
  BUILT_IN_ROLES,
  BUILT_IN_ROLE_MAP,
  resolveInheritedRoles,
} from "./role.js";

// Permission strings and parsing
export type { Permission, ParsedPermission } from "./permission.js";
export {
  permission,
  rawPermission,
  unPermission,
  parsePermission,
  permissionMatches,
  ACTION_READ,
  ACTION_WRITE,
  ACTION_CREATE,
  ACTION_UPDATE,
  ACTION_DELETE,
  ACTION_MANAGE,
  ACTION_EXECUTE,
  ACTION_EXPORT,
  ACTION_APPROVE,
  ACTION_WILDCARD,
  RESOURCE_CLAIM,
  RESOURCE_ORDER,
  RESOURCE_REPORT,
  RESOURCE_SOURCE,
  RESOURCE_AGENT,
  RESOURCE_BILLING,
  RESOURCE_ADMIN,
  RESOURCE_MEMBER,
  RESOURCE_WEBHOOK,
  RESOURCE_API_KEY,
  RESOURCE_AUDIT,
  RESOURCE_WILDCARD,
} from "./permission.js";

// Policy model
export type { PolicyEffect, PolicyRule, Policy, PolicyInput } from "./policy.js";
export { policySchema, parsePolicy, mergePolicyRules } from "./policy.js";

// Enforcer
export type { EnforcerOptions, EvaluationContext, Decision, EvaluationResult } from "./enforcer.js";
export { evaluate, enforce } from "./enforcer.js";

// Permission matrix
export {
  PERMISSION_MATRIX,
  PERMISSION_MATRIX_BY_ROLE,
  getDirectPermissions,
} from "./permission-matrix.js";

// Scope expansion
export type { Scope } from "./scopes.js";
export { expandScope, expandScopes, knownScopes } from "./scopes.js";

// Decorators / HOF guards
export type { PermissionEnforcer, PermissionContext } from "./decorators.js";
export {
  requirePermission,
  requirePermissionSync,
  requireAllPermissions,
  requireAnyPermission,
} from "./decorators.js";

// AuthzSubject
export type { AuthzSubject } from "./subject.js";
export { makeSubject, subjectHasRole, withAttributes } from "./subject.js";

// ResourceDescriptor
export type { ResourceType, ResourceDescriptor } from "./resource.js";
export { makeResource, WILDCARD_RESOURCE, resourceMatchesType } from "./resource.js";

// Grant / revoke
export type { RoleGrant, CreateRoleGrant } from "./grant.js";
export { makeGrant, isGrantActive, addGrant, revokeGrant, activeRolesForUser } from "./grant.js";

// Role store
export type { RoleStore } from "./role-store.js";
export { InMemoryRoleStore } from "./role-store.js";

// Errors
export {
  AuthzError,
  PermissionDeniedError,
  RoleNotFoundError,
  RoleAlreadyExistsError,
  PolicyConflictError,
  InvalidGrantError,
  isAuthzError,
  isPermissionDeniedError,
  isRoleNotFoundError,
} from "./errors.js";

// Audit
export type { AuthzDecision, AuthzAuditEntry, AuthzAuditHook } from "./audit.js";
export {
  makeAuditEntry,
  createLoggingAuditHook,
  InMemoryAuditLog,
  composeAuditHooks,
} from "./audit.js";

// Express middleware
export type { RbacMiddlewareOptions } from "./middleware.js";
export {
  PRINCIPAL_KEY,
  getPrincipal,
  setPrincipal,
  rbacMiddleware,
  requireAll,
  orgIdFromHeader,
} from "./middleware.js";

// Resource-specific permission sets
export {
  REPORT_READ,
  REPORT_CREATE,
  REPORT_UPDATE,
  REPORT_DELETE,
  REPORT_EXPORT,
  REPORT_MANAGE,
  ALL_REPORT_PERMISSIONS,
  REPORT_ROLE_PERMISSIONS,
} from "./resources/report.permissions.js";

export {
  ORDER_READ,
  ORDER_CREATE,
  ORDER_UPDATE,
  ORDER_DELETE,
  ORDER_APPROVE,
  ORDER_MANAGE,
  ALL_ORDER_PERMISSIONS,
  ORDER_ROLE_PERMISSIONS,
} from "./resources/order.permissions.js";

export {
  AGENT_READ,
  AGENT_CREATE,
  AGENT_UPDATE,
  AGENT_DELETE,
  AGENT_EXECUTE,
  AGENT_MANAGE,
  ALL_AGENT_PERMISSIONS,
  AGENT_ROLE_PERMISSIONS,
} from "./resources/agent.permissions.js";

export {
  BILLING_READ,
  BILLING_CREATE,
  BILLING_UPDATE,
  BILLING_DELETE,
  BILLING_MANAGE,
  ALL_BILLING_PERMISSIONS,
  BILLING_ROLE_PERMISSIONS,
} from "./resources/billing.permissions.js";

export {
  ADMIN_MANAGE,
  ADMIN_WILDCARD,
  AUDIT_READ,
  AUDIT_MANAGE,
  MEMBER_READ,
  MEMBER_CREATE,
  MEMBER_UPDATE,
  MEMBER_DELETE,
  MEMBER_MANAGE,
  ALL_ADMIN_PERMISSIONS,
  ADMIN_ROLE_PERMISSIONS,
} from "./resources/admin.permissions.js";
