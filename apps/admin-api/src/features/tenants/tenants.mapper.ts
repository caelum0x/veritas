// Maps OrganizationOutput domain objects to tenant HTTP response shapes.
import type { OrganizationOutput } from "@veritas/services";

export interface TenantResponse {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly ownerId: string;
  readonly billingEmail: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TenantListResponse {
  readonly items: TenantResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Convert a single OrganizationOutput to a TenantResponse. */
export function toTenantResponse(org: OrganizationOutput): TenantResponse {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    ownerId: org.ownerId,
    billingEmail: org.billingEmail,
    metadata: org.metadata as Record<string, unknown> | undefined,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

/** Convert a paginated organization list to a TenantListResponse. */
export function toTenantListResponse(result: {
  items: OrganizationOutput[];
  nextCursor: string | null;
  total: number;
}): TenantListResponse {
  return {
    items: result.items.map(toTenantResponse),
    nextCursor: result.nextCursor,
    total: result.total,
  };
}
