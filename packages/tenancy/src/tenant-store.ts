// Tenant repository interface and in-memory implementation
import { Tenant, TenantId } from "./tenant.js";

export interface TenantStore {
  findById(id: TenantId): Promise<Tenant | undefined>;
  findBySlug(slug: string): Promise<Tenant | undefined>;
  findByOrganizationId(orgId: string): Promise<Tenant[]>;
  save(tenant: Tenant): Promise<Tenant>;
  delete(id: TenantId): Promise<void>;
  list(limit?: number, offset?: number): Promise<Tenant[]>;
}

export class InMemoryTenantStore implements TenantStore {
  private readonly tenants = new Map<TenantId, Tenant>();

  async findById(id: TenantId): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async findBySlug(slug: string): Promise<Tenant | undefined> {
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === slug) {
        return tenant;
      }
    }
    return undefined;
  }

  async findByOrganizationId(orgId: string): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(
      (t) => t.organizationId === orgId
    );
  }

  async save(tenant: Tenant): Promise<Tenant> {
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async delete(id: TenantId): Promise<void> {
    this.tenants.delete(id);
  }

  async list(limit = 100, offset = 0): Promise<Tenant[]> {
    const all = Array.from(this.tenants.values());
    return all.slice(offset, offset + limit);
  }
}
