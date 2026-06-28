// Provision and deprovision tenant lifecycle operations
import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import { ValidationError, ConflictError, NotFoundError } from "@veritas/core";
import { TenantSettings, DEFAULT_TENANT_SETTINGS } from "./settings.js";
import { PlanLimits, getPlanLimits } from "./plan-limits.js";

export const ProvisionRequestSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9-]{2,63}$/),
  planSlug: z.string().min(1).default("free"),
  ownerEmail: z.string().email(),
  settings: z.record(z.unknown()).optional(),
});

export type ProvisionRequest = z.infer<typeof ProvisionRequestSchema>;

export interface ProvisionedTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly planSlug: string;
  readonly planLimits: PlanLimits;
  readonly ownerEmail: string;
  readonly settings: TenantSettings;
  readonly provisionedAt: string;
  readonly active: boolean;
}

export const DeprovisionRequestSchema = z.object({
  tenantId: z.string().min(1),
  reason: z.string().min(1).optional(),
  hardDelete: z.boolean().default(false),
});

export type DeprovisionRequest = z.infer<typeof DeprovisionRequestSchema>;

export interface TenantProvisioningStore {
  existsBySlug(slug: string): Promise<boolean>;
  save(tenant: ProvisionedTenant): Promise<void>;
  findById(id: string): Promise<ProvisionedTenant | undefined>;
  update(tenant: ProvisionedTenant): Promise<void>;
  remove(id: string): Promise<void>;
}

export async function provisionTenant(
  request: unknown,
  store: TenantProvisioningStore
): Promise<Result<ProvisionedTenant, ValidationError | ConflictError>> {
  const parsed = ProvisionRequestSchema.safeParse(request);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid provision request", details: { issues: parsed.error.issues } }));
  }
  const data = parsed.data;
  const slugTaken = await store.existsBySlug(data.slug);
  if (slugTaken) {
    return err(new ConflictError({ message: `Tenant slug '${data.slug}' is already taken` }));
  }
  const tenant: ProvisionedTenant = Object.freeze({
    id: newId("tenant"),
    name: data.name,
    slug: data.slug,
    planSlug: data.planSlug,
    planLimits: getPlanLimits(data.planSlug),
    ownerEmail: data.ownerEmail,
    settings: DEFAULT_TENANT_SETTINGS,
    provisionedAt: new Date().toISOString(),
    active: true,
  });
  await store.save(tenant);
  return ok(tenant);
}

export async function deprovisionTenant(
  request: unknown,
  store: TenantProvisioningStore
): Promise<Result<void, ValidationError | NotFoundError>> {
  const parsed = DeprovisionRequestSchema.safeParse(request);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid deprovision request", details: { issues: parsed.error.issues } }));
  }
  const { tenantId, hardDelete } = parsed.data;
  const tenant = await store.findById(tenantId);
  if (tenant === undefined) {
    return err(new NotFoundError({ message: `Tenant '${tenantId}' not found` }));
  }
  if (hardDelete) {
    await store.remove(tenantId);
  } else {
    const deactivated: ProvisionedTenant = Object.freeze({ ...tenant, active: false });
    await store.update(deactivated);
  }
  return ok(undefined);
}

/** In-memory implementation for testing and development */
export class InMemoryTenantProvisioningStore implements TenantProvisioningStore {
  private readonly tenants = new Map<string, ProvisionedTenant>();

  async existsBySlug(slug: string): Promise<boolean> {
    for (const t of this.tenants.values()) {
      if (t.slug === slug) return true;
    }
    return false;
  }

  async save(tenant: ProvisionedTenant): Promise<void> {
    this.tenants.set(tenant.id, tenant);
  }

  async findById(id: string): Promise<ProvisionedTenant | undefined> {
    return this.tenants.get(id);
  }

  async update(tenant: ProvisionedTenant): Promise<void> {
    this.tenants.set(tenant.id, tenant);
  }

  async remove(id: string): Promise<void> {
    this.tenants.delete(id);
  }
}
