// Settlement resolvers: Query, Mutation, and field resolvers for the Settlement type.
import type { Settlement } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface SettlementQueryArgs {
  id: string;
}

interface SettlementsQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface CreateSettlementArgs {
  input: { orderId: string; amount: string; currency: string };
}

interface UpdateSettlementArgs {
  id: string;
  input: { status?: string | null; settledAt?: string | null };
}

interface DeleteSettlementArgs {
  id: string;
}

/** Resolves a single Settlement by ID via the dataloader. */
async function resolveSettlement(
  _parent: unknown,
  args: SettlementQueryArgs,
  ctx: GqlContext,
): Promise<Settlement | null> {
  return ctx.loaders.settlement.load(args.id);
}

/** Resolves a paginated list of Settlements. */
async function resolveSettlements(
  _parent: unknown,
  args: SettlementsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Settlement>> {
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

/** Creates a new Settlement via the service context. */
async function createSettlement(
  _parent: unknown,
  args: CreateSettlementArgs,
  ctx: GqlContext,
): Promise<Settlement> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createSettlement not yet delegated: orderId="${args.input.orderId}"`),
  );
}

/** Updates an existing Settlement via the service context. */
async function updateSettlement(
  _parent: unknown,
  args: UpdateSettlementArgs,
  ctx: GqlContext,
): Promise<Settlement> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.settlement.load(args.id);
  if (existing === null) {
    throw notFound("Settlement", args.id);
  }
  throw toGraphQLError(
    new Error(`updateSettlement not yet delegated for id="${args.id}"`),
  );
}

/** Deletes a Settlement by ID. */
async function deleteSettlement(
  _parent: unknown,
  args: DeleteSettlementArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.settlement.load(args.id);
  if (existing === null) {
    throw notFound("Settlement", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteSettlement not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Settlement type. */
export const settlementResolvers: ResolverMap = {
  Query: {
    settlement: resolveSettlement as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    settlements: resolveSettlements as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createSettlement: createSettlement as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateSettlement: updateSettlement as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteSettlement: deleteSettlement as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
};
