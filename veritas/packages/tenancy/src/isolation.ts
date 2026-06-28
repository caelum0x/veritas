// Scope queries and data access to the current tenant boundary
import { TenantId } from "./tenant.js";
import { requireCurrentTenantId } from "./tenant-context.js";

export interface TenantScoped {
  readonly tenantId: TenantId;
}

export function assertSameTenant(record: TenantScoped, tenantId: TenantId): void {
  if (record.tenantId !== tenantId) {
    throw new Error(
      `Tenant isolation violation: record belongs to ${record.tenantId}, expected ${tenantId}`
    );
  }
}

export function filterByTenant<T extends TenantScoped>(
  records: readonly T[],
  tenantId: TenantId
): T[] {
  return records.filter((r) => r.tenantId === tenantId);
}

export function filterByCurrentTenant<T extends TenantScoped>(
  records: readonly T[]
): T[] {
  const tenantId = requireCurrentTenantId();
  return filterByTenant(records, tenantId);
}

export function scopeToTenant<T extends object>(
  data: T,
  tenantId: TenantId
): T & TenantScoped {
  return { ...data, tenantId };
}

export function scopeToCurrentTenant<T extends object>(
  data: T
): T & TenantScoped {
  const tenantId = requireCurrentTenantId();
  return scopeToTenant(data, tenantId);
}

export function assertCurrentTenantOwns(record: TenantScoped): void {
  const tenantId = requireCurrentTenantId();
  assertSameTenant(record, tenantId);
}

export function buildTenantFilter(tenantId: TenantId): { tenantId: TenantId } {
  return { tenantId };
}

export function buildCurrentTenantFilter(): { tenantId: TenantId } {
  return buildTenantFilter(requireCurrentTenantId());
}
