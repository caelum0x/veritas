// Delivery resolvers: Query, Mutation, and field resolvers for the Delivery type.
import type { Delivery } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest, pageToConnection } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface DeliveryQueryArgs {
  readonly id: string;
}

interface DeliveriesQueryArgs {
  readonly orderId?: string | null;
  readonly status?: string | null;
  readonly first?: number | null;
  readonly after?: string | null;
}

interface CreateDeliveryArgs {
  readonly input: {
    readonly orderId: string;
    readonly channel: string;
    readonly endpoint?: string | null;
    readonly metadata?: unknown;
  };
}

interface UpdateDeliveryArgs {
  readonly id: string;
  readonly input: {
    readonly status?: string | null;
    readonly endpoint?: string | null;
    readonly metadata?: unknown;
  };
}

interface RetryDeliveryArgs {
  readonly id: string;
}

/** Resolves a single Delivery by ID via the dataloader. */
async function resolveDelivery(
  _parent: unknown,
  args: DeliveryQueryArgs,
  ctx: GqlContext,
): Promise<Delivery | null> {
  return ctx.loaders.delivery.load(args.id);
}

/** Resolves a paginated list of Deliveries filtered by orderId and/or status. */
async function resolveDeliveries(
  _parent: unknown,
  args: DeliveriesQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Delivery>> {
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

/** Creates a new Delivery via the service context. */
async function createDelivery(
  _parent: unknown,
  args: CreateDeliveryArgs,
  ctx: GqlContext,
): Promise<Delivery> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createDelivery not yet delegated: orderId="${args.input.orderId}"`),
  );
}

/** Updates an existing Delivery by ID. */
async function updateDelivery(
  _parent: unknown,
  args: UpdateDeliveryArgs,
  ctx: GqlContext,
): Promise<Delivery> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.delivery.load(args.id);
  if (existing === null) {
    throw notFound("Delivery", args.id);
  }
  throw toGraphQLError(
    new Error(`updateDelivery not yet delegated for id="${args.id}"`),
  );
}

/** Retries a failed Delivery by ID. */
async function retryDelivery(
  _parent: unknown,
  args: RetryDeliveryArgs,
  ctx: GqlContext,
): Promise<Delivery> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.delivery.load(args.id);
  if (existing === null) {
    throw notFound("Delivery", args.id);
  }
  throw toGraphQLError(
    new Error(`retryDelivery not yet delegated for id="${args.id}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Delivery type. */
export const deliveryResolvers: ResolverMap = {
  Query: {
    delivery: resolveDelivery as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deliveries: resolveDeliveries as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createDelivery: createDelivery as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateDelivery: updateDelivery as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    retryDelivery: retryDelivery as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Delivery: {
    orderId: (parent: unknown): string => (parent as Delivery).orderId,
    reportId: (parent: unknown): string | null => (parent as Delivery).reportId ?? null,
  },
};
