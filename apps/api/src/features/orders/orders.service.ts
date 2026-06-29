// Orders feature service: delegates CRUD and lifecycle operations to @veritas/services OrderService.
import { isErr, epochToIso, newId, type Result, type Page } from "@veritas/core";
import {
  OrderService,
  makeServiceContext,
  type CreateOrderInput,
  type ListOrdersInput,
  type OrderOutput,
} from "@veritas/services";
import type { Container } from "@veritas/container";
import { ORDER_SVC, LOGGER } from "@veritas/container/tokens";
import type { Logger } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

/** Subset of Container used by the orders feature. */
export interface OrdersDeps {
  readonly orderService: OrderService;
  readonly logger: Logger;
}

/** Resolve order dependencies from the DI container. */
export function resolveOrdersDeps(container: Container): OrdersDeps {
  return {
    orderService: container.resolve(ORDER_SVC) as OrderService,
    logger: container.resolve(LOGGER) as Logger,
  };
}

/** Build a ServiceContext from an authenticated HTTP request. */
function makeCtx(req: AuthenticatedRequest) {
  const reqId = newId("req");
  return makeServiceContext(
    {
      userId: req.userId ?? "anonymous",
      orgId: req.orgId,
      roles: req.scopes ?? [],
      apiKeyId: req.apiKeyId,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

/** Create a new order. */
export async function createOrder(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  input: CreateOrderInput,
): Promise<Result<OrderOutput>> {
  const ctx = makeCtx(req);
  return deps.orderService.create(ctx, input);
}

/** Retrieve a single order by ID. */
export async function getOrderById(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  orderId: string,
): Promise<Result<OrderOutput>> {
  const ctx = makeCtx(req);
  return deps.orderService.getById(ctx, orderId);
}

/** List orders with optional filters and pagination. */
export async function listOrders(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  input: ListOrdersInput,
): Promise<Result<Page<OrderOutput>>> {
  const ctx = makeCtx(req);
  return deps.orderService.list(ctx, input);
}

/** Transition an order to PAID status. */
export async function markOrderPaid(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  orderId: string,
): Promise<Result<OrderOutput>> {
  const ctx = makeCtx(req);
  return deps.orderService.markPaid(ctx, orderId);
}

/** Transition an order to FULFILLED status and attach the completed job. */
export async function markOrderFulfilled(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  orderId: string,
  jobId: string,
  settlementId?: string,
): Promise<Result<OrderOutput>> {
  const ctx = makeCtx(req);
  return deps.orderService.markFulfilled(ctx, orderId, jobId, settlementId);
}

/** Cancel a PENDING order. */
export async function cancelOrder(
  deps: OrdersDeps,
  req: AuthenticatedRequest,
  orderId: string,
): Promise<Result<OrderOutput>> {
  const ctx = makeCtx(req);
  return deps.orderService.cancel(ctx, orderId);
}
