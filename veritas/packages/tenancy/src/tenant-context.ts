// AsyncLocalStorage-based tenant context for request scoping
import { AsyncLocalStorage } from "node:async_hooks";
import { Tenant, TenantId } from "./tenant.js";

export interface TenantContext {
  readonly tenant: Tenant;
  readonly actorId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getCurrentTenant(): Tenant | undefined {
  return storage.getStore()?.tenant;
}

export function requireCurrentTenant(): Tenant {
  const tenant = getCurrentTenant();
  if (tenant === undefined) {
    throw new Error("No tenant context available in current async scope");
  }
  return tenant;
}

export function getCurrentTenantId(): TenantId | undefined {
  return getCurrentTenant()?.id;
}

export function requireCurrentTenantId(): TenantId {
  return requireCurrentTenant().id;
}

export function getCurrentContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireCurrentContext(): TenantContext {
  const ctx = getCurrentContext();
  if (ctx === undefined) {
    throw new Error("No tenant context available in current async scope");
  }
  return ctx;
}
