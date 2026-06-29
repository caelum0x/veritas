// Assert that the current principal has access to the given tenant
import { CrossTenantError } from "./cross-tenant-error.js";
import { TenantContext } from "./tenant-context.js";

export interface TenantGuardOptions {
  /** When true, super-admin principals bypass isolation checks */
  allowSuperAdmin?: boolean;
}

export interface GuardPrincipal {
  tenantId: string;
  isSuperAdmin?: boolean;
}

/** Throws CrossTenantError if principal's tenantId differs from the requested tenantId */
export function assertTenantAccess(
  principal: GuardPrincipal,
  requestedTenantId: string,
  options: TenantGuardOptions = {}
): void {
  if (options.allowSuperAdmin && principal.isSuperAdmin) {
    return;
  }
  if (principal.tenantId !== requestedTenantId) {
    throw new CrossTenantError(
      `Principal tenant '${principal.tenantId}' may not access tenant '${requestedTenantId}'`
    );
  }
}

/** Asserts the current AsyncLocalStorage context tenant matches requestedTenantId */
export function assertContextTenantAccess(
  ctx: TenantContext,
  requestedTenantId: string
): void {
  const current = ctx.tenant;
  if (current.id !== requestedTenantId) {
    throw new CrossTenantError(
      `Context tenant '${current.id}' may not access tenant '${requestedTenantId}'`
    );
  }
}
