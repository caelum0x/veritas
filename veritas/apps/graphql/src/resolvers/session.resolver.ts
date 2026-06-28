// Session resolvers: Query and Mutation resolvers for the Session type.
import type { Session } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface SessionQueryArgs {
  id: string;
}

interface SessionsQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface CreateSessionArgs {
  input: { userId: string; token: string; expiresAt: string };
}

interface DeleteSessionArgs {
  id: string;
}

/** Resolves a single Session by ID via the dataloader. */
async function resolveSession(
  _parent: unknown,
  args: SessionQueryArgs,
  ctx: GqlContext,
): Promise<Session | null> {
  return ctx.loaders.session.load(args.id);
}

/** Resolves a paginated list of Sessions. */
async function resolveSessions(
  _parent: unknown,
  args: SessionsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Session>> {
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

/** Creates a new Session via the service context. */
async function createSession(
  _parent: unknown,
  args: CreateSessionArgs,
  ctx: GqlContext,
): Promise<Session> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createSession not yet delegated: userId="${args.input.userId}"`),
  );
}

/** Deletes a Session by ID. */
async function deleteSession(
  _parent: unknown,
  args: DeleteSessionArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.session.load(args.id);
  if (existing === null) {
    throw notFound("Session", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteSession not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Session type. */
export const sessionResolvers: ResolverMap = {
  Query: {
    session: resolveSession as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    sessions: resolveSessions as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createSession: createSession as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteSession: deleteSession as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
};
