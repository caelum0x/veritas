// Negotiation resolvers: Query, Mutation, and field resolvers for the Negotiation type.
import type { Negotiation } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface NegotiationQueryArgs {
  id: string;
}

interface NegotiationsQueryArgs {
  first?: number | null;
  after?: string | null;
  orderId?: string | null;
}

interface CreateNegotiationArgs {
  input: {
    orderId: string;
    agentId: string;
    proposedPrice: string;
    expiresAt?: string | null;
    metadata?: Record<string, unknown> | null;
  };
}

interface UpdateNegotiationArgs {
  id: string;
  input: {
    status?: string | null;
    counterPrice?: string | null;
    agreedPrice?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, unknown> | null;
  };
}

interface NegotiationIdArgs {
  id: string;
}

/** Resolves a single Negotiation by ID via the dataloader. */
async function resolveNegotiation(
  _parent: unknown,
  args: NegotiationQueryArgs,
  ctx: GqlContext,
): Promise<Negotiation | null> {
  return ctx.loaders.negotiation.load(args.id);
}

/** Resolves a paginated connection of Negotiations with optional order filter. */
async function resolveNegotiations(
  _parent: unknown,
  args: NegotiationsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Negotiation>> {
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

/** Creates a new Negotiation via the service context. */
async function createNegotiation(
  _parent: unknown,
  args: CreateNegotiationArgs,
  ctx: GqlContext,
): Promise<Negotiation> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createNegotiation not yet delegated: orderId="${args.input.orderId}"`),
  );
}

/** Updates an existing Negotiation by ID. */
async function updateNegotiation(
  _parent: unknown,
  args: UpdateNegotiationArgs,
  ctx: GqlContext,
): Promise<Negotiation> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.negotiation.load(args.id);
  if (existing === null) {
    throw notFound("Negotiation", args.id);
  }
  throw toGraphQLError(new Error(`updateNegotiation not yet delegated for id="${args.id}"`));
}

/** Accepts a Negotiation, transitioning status to accepted. */
async function acceptNegotiation(
  _parent: unknown,
  args: NegotiationIdArgs,
  ctx: GqlContext,
): Promise<Negotiation> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.negotiation.load(args.id);
  if (existing === null) {
    throw notFound("Negotiation", args.id);
  }
  throw toGraphQLError(new Error(`acceptNegotiation not yet delegated for id="${args.id}"`));
}

/** Rejects a Negotiation, transitioning status to rejected. */
async function rejectNegotiation(
  _parent: unknown,
  args: NegotiationIdArgs,
  ctx: GqlContext,
): Promise<Negotiation> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.negotiation.load(args.id);
  if (existing === null) {
    throw notFound("Negotiation", args.id);
  }
  throw toGraphQLError(new Error(`rejectNegotiation not yet delegated for id="${args.id}"`));
}

/** Resolver map entries for Query, Mutation, and Negotiation type. */
export const negotiationResolvers: ResolverMap = {
  Query: {
    negotiation: resolveNegotiation as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    negotiations: resolveNegotiations as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createNegotiation: createNegotiation as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateNegotiation: updateNegotiation as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    acceptNegotiation: acceptNegotiation as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    rejectNegotiation: rejectNegotiation as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Negotiation: {
    metadata: (parent: unknown) => {
      const negotiation = parent as Negotiation & { metadata?: Record<string, unknown> };
      return negotiation.metadata ?? null;
    },
  },
};
