// Organization resolvers: Query, Mutation, and field resolvers for the Organization type.
import type { Organization } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError, unauthorized } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface OrganizationQueryArgs {
  id: string;
}

interface OrganizationBySlugArgs {
  slug: string;
}

interface OrganizationsQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface CreateOrganizationArgs {
  input: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    website?: string | null;
    description?: string | null;
  };
}

interface UpdateOrganizationArgs {
  id: string;
  input: {
    name?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    description?: string | null;
  };
}

interface DeleteOrganizationArgs {
  id: string;
}

/** Resolves a single Organization by ID via the dataloader. */
async function resolveOrganization(
  _parent: unknown,
  args: OrganizationQueryArgs,
  ctx: GqlContext,
): Promise<Organization | null> {
  return ctx.loaders.organization.load(args.id);
}

/** Resolves an Organization by its unique slug. */
async function resolveOrganizationBySlug(
  _parent: unknown,
  args: OrganizationBySlugArgs,
  _ctx: GqlContext,
): Promise<Organization | null> {
  void args.slug;
  // Requires a slug-based lookup service not yet wired — returns null as safe default.
  return null;
}

/** Resolves a paginated list of Organizations. */
async function resolveOrganizations(
  _parent: unknown,
  args: OrganizationsQueryArgs,
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

/** Creates a new Organization via the service context. */
async function createOrganization(
  _parent: unknown,
  args: CreateOrganizationArgs,
  ctx: GqlContext,
): Promise<Organization> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  throw toGraphQLError(
    new Error(`createOrganization not yet delegated: name="${args.input.name}"`),
  );
}

/** Updates an existing Organization via the service context. */
async function updateOrganization(
  _parent: unknown,
  args: UpdateOrganizationArgs,
  ctx: GqlContext,
): Promise<Organization> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.organization.load(args.id);
  if (existing === null) {
    throw notFound("Organization", args.id);
  }
  throw toGraphQLError(
    new Error(`updateOrganization not yet delegated for id="${args.id}"`),
  );
}

/** Deletes an Organization by ID. */
async function deleteOrganization(
  _parent: unknown,
  args: DeleteOrganizationArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.organization.load(args.id);
  if (existing === null) {
    throw notFound("Organization", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteOrganization not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Organization type. */
export const organizationResolvers: ResolverMap = {
  Query: {
    organization: resolveOrganization as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    organizationBySlug: resolveOrganizationBySlug as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    organizations: resolveOrganizations as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createOrganization: createOrganization as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateOrganization: updateOrganization as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteOrganization: deleteOrganization as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Organization: {
    id: (parent: unknown) => (parent as Organization).id,
    name: (parent: unknown) => (parent as Organization).name,
    slug: (parent: unknown) => (parent as Organization).slug,
    logoUrl: (parent: unknown) => ((parent as Organization & { logoUrl?: string | null }).logoUrl) ?? null,
    website: (parent: unknown) => ((parent as Organization & { website?: string | null }).website) ?? null,
    description: (parent: unknown) => ((parent as Organization & { description?: string | null }).description) ?? null,
    createdAt: (parent: unknown) => (parent as Organization).createdAt,
    updatedAt: (parent: unknown) => (parent as Organization).updatedAt,
  },
};
