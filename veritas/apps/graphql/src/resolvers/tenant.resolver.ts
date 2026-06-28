// Tenant resolvers: Query, Mutation, and field resolvers for the Tenant (Organization) type.
import type { Organization } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError, unauthorized } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface TenantQueryArgs {
  id: string;
}

interface TenantsQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface CreateTenantArgs {
  input: {
    slug: string;
    name: string;
    ownerId: string;
    billingEmail?: string | null;
  };
}

interface UpdateTenantArgs {
  id: string;
  input: {
    name?: string | null;
    billingEmail?: string | null;
  };
}

interface DeleteTenantArgs {
  id: string;
}

/** Resolves a single Tenant (Organization) by ID via the dataloader. */
async function resolveTenant(
  _parent: unknown,
  args: TenantQueryArgs,
  ctx: GqlContext,
): Promise<Organization | null> {
  return ctx.loaders.tenant.load(args.id);
}

/** Resolves a paginated list of Tenants. */
async function resolveTenants(
  _parent: unknown,
  args: TenantsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Organization>> {
  const pageReq = connectionArgsToPageRequest({ first: args.first, after: args.after });
  void pageReq;
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    totalCount: 0,
  };
}

/** Creates a new Tenant (Organization) via the service context. */
async function createTenant(
  _parent: unknown,
  args: CreateTenantArgs,
  ctx: GqlContext,
): Promise<Organization> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  throw toGraphQLError(
    new Error(`createTenant not yet delegated: received slug="${args.input.slug}"`),
  );
}

/** Updates an existing Tenant (Organization) via the service context. */
async function updateTenant(
  _parent: unknown,
  args: UpdateTenantArgs,
  ctx: GqlContext,
): Promise<Organization> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.tenant.load(args.id);
  if (existing === null) {
    throw notFound("Tenant", args.id);
  }
  throw toGraphQLError(
    new Error(`updateTenant not yet delegated for id="${args.id}"`),
  );
}

/** Deletes a Tenant (Organization) by ID. */
async function deleteTenant(
  _parent: unknown,
  args: DeleteTenantArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.tenant.load(args.id);
  if (existing === null) {
    throw notFound("Tenant", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteTenant not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Tenant type. */
export const tenantResolvers: ResolverMap = {
  Query: {
    tenant: resolveTenant as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    tenants: resolveTenants as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createTenant: createTenant as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateTenant: updateTenant as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteTenant: deleteTenant as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Tenant: {
    id: (parent: unknown) => (parent as Organization).id,
    slug: (parent: unknown) => (parent as Organization).slug,
    name: (parent: unknown) => (parent as Organization).name,
    ownerId: (parent: unknown) => (parent as Organization).ownerId,
    billingEmail: (parent: unknown) => (parent as Organization).billingEmail ?? null,
    createdAt: (parent: unknown) => (parent as Organization).createdAt,
    updatedAt: (parent: unknown) => (parent as Organization).updatedAt,
  },
};
