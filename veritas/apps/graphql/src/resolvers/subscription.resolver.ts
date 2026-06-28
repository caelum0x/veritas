// Subscription resolvers: Query, Mutation, and field resolvers for the Subscription type.
import type { Subscription } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface SubscriptionQueryArgs {
  id: string;
}

interface SubscriptionsQueryArgs {
  organizationId?: string | null;
  first?: number | null;
  after?: string | null;
}

interface CreateSubscriptionArgs {
  input: {
    organizationId: string;
    planId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
}

interface UpdateSubscriptionArgs {
  id: string;
  input: {
    status?: string | null;
    planId?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    cancelledAt?: string | null;
  };
}

interface CancelSubscriptionArgs {
  id: string;
}

async function resolveSubscription(
  _parent: unknown,
  args: SubscriptionQueryArgs,
  ctx: GqlContext,
): Promise<Subscription | null> {
  return ctx.loaders.subscription.load(args.id);
}

async function resolveSubscriptions(
  _parent: unknown,
  args: SubscriptionsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Subscription>> {
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

async function createSubscription(
  _parent: unknown,
  args: CreateSubscriptionArgs,
  ctx: GqlContext,
): Promise<Subscription> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createSubscription not yet delegated: planId="${args.input.planId}"`),
  );
}

async function updateSubscription(
  _parent: unknown,
  args: UpdateSubscriptionArgs,
  ctx: GqlContext,
): Promise<Subscription> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.subscription.load(args.id);
  if (existing === null) {
    throw notFound("Subscription", args.id);
  }
  throw toGraphQLError(new Error(`updateSubscription not yet delegated for id="${args.id}"`));
}

async function cancelSubscription(
  _parent: unknown,
  args: CancelSubscriptionArgs,
  ctx: GqlContext,
): Promise<Subscription> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.subscription.load(args.id);
  if (existing === null) {
    throw notFound("Subscription", args.id);
  }
  throw toGraphQLError(new Error(`cancelSubscription not yet delegated for id="${args.id}"`));
}

export const subscriptionResolvers: ResolverMap = {
  Query: {
    subscription: resolveSubscription as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    subscriptions: resolveSubscriptions as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createSubscription: createSubscription as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateSubscription: updateSubscription as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    cancelSubscription: cancelSubscription as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
};
