// User resolvers: Query, Mutation, and field resolvers for the User type.
import type { User } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError, unauthorized } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface UserQueryArgs {
  id: string;
}

interface UsersQueryArgs {
  first?: number | null;
  after?: string | null;
}

interface UpdateUserArgs {
  id: string;
  input: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
}

interface DeleteUserArgs {
  id: string;
}

/** Resolves a single User by ID via the dataloader. */
async function resolveUser(
  _parent: unknown,
  args: UserQueryArgs,
  ctx: GqlContext,
): Promise<User | null> {
  return ctx.loaders.user.load(args.id);
}

/** Resolves the currently authenticated user from the principal. */
async function resolveMe(
  _parent: unknown,
  _args: Record<string, unknown>,
  ctx: GqlContext,
): Promise<User | null> {
  if (!ctx.principal) return null;
  return ctx.loaders.user.load(ctx.principal.id);
}

/** Resolves a paginated list of Users. */
async function resolveUsers(
  _parent: unknown,
  args: UsersQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<User>> {
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

/** Updates an existing User via the service context. */
async function updateUser(
  _parent: unknown,
  args: UpdateUserArgs,
  ctx: GqlContext,
): Promise<User> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.user.load(args.id);
  if (existing === null) {
    throw notFound("User", args.id);
  }
  throw toGraphQLError(
    new Error(`updateUser not yet delegated for id="${args.id}"`),
  );
}

/** Deletes a User by ID. */
async function deleteUser(
  _parent: unknown,
  args: DeleteUserArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw unauthorized();
  }
  const existing = await ctx.loaders.user.load(args.id);
  if (existing === null) {
    throw notFound("User", args.id);
  }
  throw toGraphQLError(
    new Error(`deleteUser not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and User type. */
export const userResolvers: ResolverMap = {
  Query: {
    user: resolveUser as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    me: resolveMe as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    users: resolveUsers as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    updateUser: updateUser as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteUser: deleteUser as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  User: {
    id: (parent: unknown) => (parent as User).id,
    name: (parent: unknown) => (parent as User).name,
    email: (parent: unknown) => (parent as User).email,
    avatarUrl: (parent: unknown) => (parent as User).avatarUrl ?? null,
    createdAt: (parent: unknown) => (parent as User).createdAt,
    updatedAt: (parent: unknown) => (parent as User).updatedAt,
  },
};
