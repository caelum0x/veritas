// Public surface of @veritas/tenancy — re-exports all tenancy primitives
export type { Tenant, TenantId } from "./tenant.js";
export {
  newTenantId,
  asTenantId,
  makeTenant,
  withStatus,
} from "./tenant.js";

export {
  runWithTenant,
  getCurrentTenant,
  requireCurrentTenant,
  getCurrentTenantId,
  requireCurrentTenantId,
  getCurrentContext,
  requireCurrentContext,
} from "./tenant-context.js";

export type { TenantContext } from "./tenant-context.js";

export type { TenantResolver, ResolveOptions, ResolutionStrategy } from "./tenant-resolver.js";
export { TenantResolver as TenantResolverClass } from "./tenant-resolver.js";

export type { TenantStore } from "./tenant-store.js";
export { InMemoryTenantStore } from "./tenant-store.js";

export {
  scopeToTenant,
  assertSameTenant,
} from "./isolation.js";

export { assertTenantAccess } from "./tenant-guard.js";

export { CrossTenantError } from "./cross-tenant-error.js";

export type { PlanLimits } from "./plan-limits.js";
export {
  PLAN_LIMITS,
  getPlanLimits,
  assertWithinLimit,
} from "./plan-limits.js";

export {
  provisionTenant,
  deprovisionTenant,
} from "./provisioning.js";

export type { TenantSettings } from "./settings.js";
export {
  DEFAULT_TENANT_SETTINGS,
  mergeSettings,
  isMaintenanceMode,
} from "./settings.js";

export { tenantMiddleware } from "./middleware.js";

export type {
  TenantResolutionStrategy,
  TenantResolutionOptions,
  Principal,
  TenantRequest,
  TenantProvisioningHooks,
  TenantStatus,
  TenantFeatureFlags,
} from "./types.js";
