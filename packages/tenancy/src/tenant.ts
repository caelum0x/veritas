// Tenant entity definition and branded tenant ID
import { Brand, brand, newId, Id } from "@veritas/core";
import { Organization } from "@veritas/contracts";

export type TenantId = Brand<string, "TenantId">;

export function newTenantId(): TenantId {
  return brand<string, "TenantId">(newId("tenant"));
}

export function asTenantId(value: string): TenantId {
  return brand<string, "TenantId">(value);
}

export type TenantStatus = "active" | "suspended" | "deprovisioned";

export interface Tenant {
  readonly id: TenantId;
  readonly slug: string;
  readonly displayName: string;
  readonly organizationId: string;
  readonly status: TenantStatus;
  readonly planId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: Record<string, unknown>;
}

export interface CreateTenantInput {
  readonly slug: string;
  readonly displayName: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly metadata?: Record<string, unknown>;
}

export function makeTenant(
  input: CreateTenantInput,
  now: string = new Date().toISOString()
): Tenant {
  return {
    id: newTenantId(),
    slug: input.slug,
    displayName: input.displayName,
    organizationId: input.organizationId,
    status: "active",
    planId: input.planId,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata ?? {},
  };
}

export function withStatus(tenant: Tenant, status: TenantStatus): Tenant {
  return { ...tenant, status, updatedAt: new Date().toISOString() };
}
