// Order resolvers: Query, Mutation, and field resolvers for the Order type.
import type { Order } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface OrderQueryArgs {
  id: string;
}

interface OrdersQueryArgs {
  first?: number | null;
  after?: string | null;
  organizationId?: string | null;
}

interface CreateOrderArgs {
  input: {
    organizationId: string;
    text: string;
    priority?: number | null;
    callbackUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  };
}

interface UpdateOrderArgs {
  id: string;
  input: {
    status?: string | null;
    priority?: number | null;
    callbackUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  };
}

interface CancelOrderArgs {
  id: string;
}

/** Resolves a single Order by ID via the dataloader. */
async function resolveOrder(
  _parent: unknown,
  args: OrderQueryArgs,
  ctx: GqlContext,
): Promise<Order | null> {
  return ctx.loaders.order.load(args.id);
}

/** Resolves a paginated connection of Orders with optional org filter. */
async function resolveOrders(
  _parent: unknown,
  args: OrdersQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Order>> {
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

/** Creates a new Order via the service context. */
async function createOrder(
  _parent: unknown,
  args: CreateOrderArgs,
  ctx: GqlContext,
): Promise<Order> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createOrder not yet delegated: orgId="${args.input.organizationId}"`),
  );
}

/** Updates an existing Order by ID. */
async function updateOrder(
  _parent: unknown,
  args: UpdateOrderArgs,
  ctx: GqlContext,
): Promise<Order> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.order.load(args.id);
  if (existing === null) {
    throw notFound("Order", args.id);
  }
  throw toGraphQLError(new Error(`updateOrder not yet delegated for id="${args.id}"`));
}

/** Cancels an Order by ID, transitioning its status to cancelled. */
async function cancelOrder(
  _parent: unknown,
  args: CancelOrderArgs,
  ctx: GqlContext,
): Promise<Order> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.order.load(args.id);
  if (existing === null) {
    throw notFound("Order", args.id);
  }
  throw toGraphQLError(new Error(`cancelOrder not yet delegated for id="${args.id}"`));
}

/** Resolver map entries for Query, Mutation, and Order type. */
export const orderResolvers: ResolverMap = {
  Query: {
    order: resolveOrder as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    orders: resolveOrders as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createOrder: createOrder as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateOrder: updateOrder as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    cancelOrder: cancelOrder as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Order: {
    metadata: (parent: unknown) => {
      const order = parent as Order;
      return (order.metadata as Record<string, unknown> | undefined) ?? null;
    },
  },
};
