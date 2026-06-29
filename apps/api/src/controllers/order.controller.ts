// Order controller handlers: list, create, get, cancel
import type { Request, Response, NextFunction } from "express";
import { isErr, type AppError, type Result } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import {
  createOrderBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from "../validators/order.validator.js";

type ServiceResult = Result<unknown, AppError>;

interface OrderService {
  listByOrg(opts: {
    orgId: string;
    page?: number;
    limit?: number;
    cursor?: string;
    status?: string;
  }): Promise<ServiceResult>;
  create(data: Record<string, unknown>): Promise<ServiceResult>;
  getById(id: string): Promise<ServiceResult>;
  cancel(id: string, userId: string): Promise<ServiceResult>;
}

function getOrderService(req: Request): OrderService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).app.locals.container?.orderService as OrderService;
}

function handleError(res: Response, error: AppError): void {
  const httpError = toHttpError(error);
  respondError(res, httpError.statusCode, httpError.code, httpError.message, httpError.fields);
}

export const listOrdersHandler = [
  validateQuery(listOrdersQuerySchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const orderService = getOrderService(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).auth as { orgId: string } | undefined;
    const { page, limit, cursor, status } = req.query as Record<string, string | undefined>;

    const result = await orderService.listByOrg({
      orgId: auth?.orgId ?? "",
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      cursor,
      status,
    });

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondOk(res, result.value);
  }),
];

export const createOrderHandler = [
  validateBody(createOrderBodySchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const orderService = getOrderService(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).auth as { orgId: string; userId: string } | undefined;

    const result = await orderService.create({
      ...(req.body as Record<string, unknown>),
      orgId: auth?.orgId ?? "",
      createdBy: auth?.userId ?? "",
    });

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondCreated(res, result.value);
  }),
];

export const getOrderHandler = [
  validateParams(orderIdParamSchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const orderService = getOrderService(req);

    const result = await orderService.getById(req.params["id"] ?? "");

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondOk(res, result.value);
  }),
];

export const cancelOrderHandler = [
  validateParams(orderIdParamSchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const orderService = getOrderService(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).auth as { userId: string } | undefined;

    const result = await orderService.cancel(req.params["id"] ?? "", auth?.userId ?? "");

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondNoContent(res);
  }),
];
