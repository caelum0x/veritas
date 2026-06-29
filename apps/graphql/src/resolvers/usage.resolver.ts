// Usage resolvers: Query and Mutation resolvers for the Usage type.
import type { Usage } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface UsageQueryArgs {
  id: string;
}

interface UsagesQueryArgs {
  organizationId?: string | null;
  first?: number | null;
  after?: string | null;
}

interface CreateUsageArgs {
  input: {
    organizationId: string;
    subscriptionId?: string | null;
    metric: string;
    quantity: number;
    periodStart: string;
    periodEnd: string;
    metadata?: Record<string, unknown> | null;
  };
}

interface DeleteUsageArgs {
  id: string;
}

/** Resolves a single Usage record by ID via the dataloader. */
async function resolveUsage(
  _parent: unknown,
  args: UsageQueryArgs,
  ctx: GqlContext,
): Promise<Usage | null> {
  return ctx.loaders.usage.load(args.id);
}

/** Resolves a paginated list of Usage records, optionally filtered by organization. */
async function resolveUsages(
  _parent: unknown,
  args: UsagesQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Usage>> {
  const pageReq = connectionArgsToPageRequest({
    first: args.first,
    after: args.after,
  });
  void pageReq;
  void args.organizationId;
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

/** Records a new Usage entry via the service context. */
async function recordUsage(
  _parent: unknown,
  args: CreateUsageArgs,
  ctx: GqlContext,
): Promise<Usage> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`recordUsage not yet delegated: metric="${args.input.metric}"`),
  );
}

/** Deletes a Usage record by ID. */
async function deleteUsage(
  _parent: unknown,
  args: DeleteUsageArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.usage.load(args.id);
  if (existing === null) {
    throw notFound("Usage", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteUsage not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Usage type. */
export const usageResolvers: ResolverMap = {
  Query: {
    usage: resolveUsage as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    usages: resolveUsages as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    recordUsage: recordUsage as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteUsage: deleteUsage as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
};
