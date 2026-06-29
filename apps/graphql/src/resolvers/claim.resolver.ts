// Claim resolvers: Query, Mutation, and field resolvers for the Claim type.
import type { Claim } from "@veritas/contracts";
import { isErr } from "@veritas/core";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest, pageToConnection } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface ClaimQueryArgs {
  id: string;
}

interface ClaimsQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface CreateClaimArgs {
  input: { text: string; order?: number };
}

interface UpdateClaimArgs {
  id: string;
  input: {
    normalized?: string | null;
    verdict?: string | null;
    confidence?: number | null;
    reasoning?: string | null;
  };
}

interface DeleteClaimArgs {
  id: string;
}

/** Resolves a single Claim by ID via the dataloader. */
async function resolveClaim(
  _parent: unknown,
  args: ClaimQueryArgs,
  ctx: GqlContext,
): Promise<Claim | null> {
  return ctx.loaders.claim.load(args.id);
}

/** Resolves a paginated list of Claims, optionally filtered by cursor. */
async function resolveClaims(
  _parent: unknown,
  args: ClaimsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Claim>> {
  // Return empty connection — list resolution requires a backing service not yet wired.
  const pageReq = connectionArgsToPageRequest({
    first: args.first,
    after: args.after,
  });
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

/** Creates a new Claim via the service context (stub — requires wired ClaimService). */
async function createClaim(
  _parent: unknown,
  args: CreateClaimArgs,
  ctx: GqlContext,
): Promise<Claim> {
  // Guard: require authenticated principal
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  // Placeholder — real impl delegates to ClaimService
  throw toGraphQLError(
    new Error(`createClaim not yet delegated: received text="${args.input.text}"`),
  );
}

/** Updates an existing Claim via the service context. */
async function updateClaim(
  _parent: unknown,
  args: UpdateClaimArgs,
  ctx: GqlContext,
): Promise<Claim> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.claim.load(args.id);
  if (existing === null) {
    throw notFound("Claim", args.id);
  }
  throw toGraphQLError(
    new Error(`updateClaim not yet delegated for id="${args.id}"`),
  );
}

/** Deletes a Claim by ID. */
async function deleteClaim(
  _parent: unknown,
  args: DeleteClaimArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.claim.load(args.id);
  if (existing === null) {
    throw notFound("Claim", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteClaim not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Claim type. */
export const claimResolvers: ResolverMap = {
  Query: {
    claim: resolveClaim as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    claims: resolveClaims as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createClaim: createClaim as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateClaim: updateClaim as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteClaim: deleteClaim as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Claim: {
    citationIds: (parent: unknown) => {
      const claim = parent as Claim;
      return claim.citationIds;
    },
  },
};
