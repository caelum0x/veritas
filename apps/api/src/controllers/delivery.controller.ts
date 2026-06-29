// Delivery controller handlers for listing, retrieving, and confirming deliveries.
import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondPage } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import {
  listDeliveriesQuerySchema,
  getDeliveryParamsSchema,
  confirmDeliveryParamsSchema,
  confirmDeliveryBodySchema,
  deliveryIdParamSchema,
  createDeliveryBodySchema,
  updateDeliveryBodySchema,
  disputeDeliveryBodySchema,
} from "../validators/delivery.validator.js";
import { toPageRequest } from "@veritas/core";

function getDeliveryService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container.deliveryService as {
    list(opts: unknown): Promise<import("@veritas/core").Result<import("@veritas/core").Page<unknown>, import("@veritas/core").AppError>>;
    getById(id: string): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
    confirm(id: string, body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  };
}

export const listDeliveries = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const query = listDeliveriesQuerySchema.parse(req.query);
  const pageRequest = toPageRequest({ cursor: query.cursor, limit: query.limit });
  const service = getDeliveryService(req);
  const result = await service.list({ ...query, ...pageRequest });
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  respondPage(res, result.value);
});

export const getDelivery = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = getDeliveryParamsSchema.parse(req.params);
  const service = getDeliveryService(req);
  const result = await service.getById(id);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  respondOk(res, result.value);
});

export const confirmDelivery = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = confirmDeliveryParamsSchema.parse(req.params);
  const body = confirmDeliveryBodySchema.parse(req.body);
  const service = getDeliveryService(req);
  const result = await service.confirm(id, body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  respondOk(res, result.value);
});

export const createDelivery = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const body = createDeliveryBodySchema.parse(req.body);
  const service = getDeliveryService(req);
  const result = await (service as unknown as { create(body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>> }).create(body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  res.status(201).json(result.value);
});

export const updateDelivery = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = deliveryIdParamSchema.parse(req.params);
  const body = updateDeliveryBodySchema.parse(req.body);
  const service = getDeliveryService(req);
  const result = await (service as unknown as { update(id: string, body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>> }).update(id, body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  respondOk(res, result.value);
});

export const disputeDelivery = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = deliveryIdParamSchema.parse(req.params);
  const body = disputeDeliveryBodySchema.parse(req.body);
  const service = getDeliveryService(req);
  const result = await (service as unknown as { dispute(id: string, body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>> }).dispute(id, body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  respondOk(res, result.value);
});
