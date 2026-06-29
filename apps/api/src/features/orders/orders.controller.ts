// Order HTTP controllers: validate requests, call service functions, map to responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondPage, respondError } from "../../http/responder.js";
import { toHttpError } from "../../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  createOrderBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  markFulfilledBodySchema,
} from "./orders.schema.js";
import {
  createOrder,
  getOrderById,
  listOrders,
  markOrderPaid,
  markOrderFulfilled,
  cancelOrder,
  type OrdersDeps,
} from "./orders.service.js";
import { toOrderResponse, toOrderListResponse } from "./orders.mapper.js";

type AuthReq = AuthenticatedRequest;

function handleErr(res: Response, error: unknown): void {
  const httpErr = toHttpError(error as import("@veritas/core").AppError);
  respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
}

/** POST /orders — create a new order. */
export function makeCreateOrderHandler(deps: OrdersDeps) {
  return [
    validateBody(createOrderBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const result = await createOrder(deps, req as AuthReq, req.body as import("@veritas/services").CreateOrderInput);
      if (isErr(result)) return handleErr(res, result.error);
      return respondCreated(res, toOrderResponse(result.value));
    }),
  ];
}

/** GET /orders — list orders with optional filters. */
export function makeListOrdersHandler(deps: OrdersDeps) {
  return [
    validateQuery(listOrdersQuerySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const query = req.query as import("./orders.schema.js").ListOrdersQuery;
      const result = await listOrders(deps, req as AuthReq, {
        buyerAgentId: query.buyerAgentId,
        serviceId: query.serviceId,
        negotiationId: query.negotiationId,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      });
      if (isErr(result)) return handleErr(res, result.error);
      const page = result.value;
      return respondPage(res, { items: page.items.map(toOrderResponse), nextCursor: page.nextCursor, hasMore: page.hasMore });
    }),
  ];
}

/** GET /orders/:id — get a single order by ID. */
export function makeGetOrderHandler(deps: OrdersDeps) {
  return [
    validateParams(orderIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await getOrderById(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toOrderResponse(result.value));
    }),
  ];
}

/** POST /orders/:id/pay — transition order to PAID. */
export function makeMarkPaidHandler(deps: OrdersDeps) {
  return [
    validateParams(orderIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await markOrderPaid(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toOrderResponse(result.value));
    }),
  ];
}

/** POST /orders/:id/fulfill — transition order to FULFILLED. */
export function makeMarkFulfilledHandler(deps: OrdersDeps) {
  return [
    validateParams(orderIdParamSchema),
    validateBody(markFulfilledBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const { jobId, settlementId } = req.body as import("./orders.schema.js").MarkFulfilledBody;
      const result = await markOrderFulfilled(deps, req as AuthReq, id, jobId, settlementId);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toOrderResponse(result.value));
    }),
  ];
}

/** DELETE /orders/:id — cancel a PENDING order. */
export function makeCancelOrderHandler(deps: OrdersDeps) {
  return [
    validateParams(orderIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as { id: string };
      const result = await cancelOrder(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondNoContent(res);
    }),
  ];
}
