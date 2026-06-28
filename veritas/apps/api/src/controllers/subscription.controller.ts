// Controller handlers for subscription CRUD and lifecycle operations
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { responder } from "../http/responder.js";
import { HttpApiError } from "../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import {
  createSubscriptionBodySchema,
  updateSubscriptionBodySchema,
  listSubscriptionsQuerySchema,
  subscriptionIdParamSchema,
} from "../validators/subscription.validator.js";
import type { CreateSubscriptionBody, UpdateSubscriptionBody } from "../validators/subscription.validator.js";
import { toPageRequest } from "@veritas/core";

function getSubscriptionService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = (req as any).container;
  if (!container || typeof container.subscriptionService === "undefined") {
    throw new HttpApiError(503, "SERVICE_UNAVAILABLE", "Subscription service not available");
  }
  return container.subscriptionService as {
    create(data: CreateSubscriptionBody): Promise<unknown>;
    findById(id: string): Promise<unknown | null>;
    update(id: string, data: UpdateSubscriptionBody): Promise<unknown | null>;
    cancel(id: string): Promise<unknown | null>;
    list(query: Record<string, unknown>): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
  };
}

export const listSubscriptions = [
  validateQuery(listSubscriptionsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getSubscriptionService(req);
    const { limit, cursor, status, planId, organizationId } = req.query as Record<string, string | undefined>;
    const pageReq = toPageRequest({ limit: limit ? Number(limit) : undefined, cursor });
    const result = await service.list({ ...pageReq, status, planId, organizationId });
    responder.page(res, { items: result.items, nextCursor: null, hasMore: false });
  }),
];

export const getSubscription = [
  validateParams(subscriptionIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getSubscriptionService(req);
    const subscription = await service.findById(req.params["id"] as string);
    if (!subscription) throw new HttpApiError(404, "NOT_FOUND", "Subscription not found");
    responder.ok(res, subscription);
  }),
];

export const createSubscription = [
  validateBody(createSubscriptionBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getSubscriptionService(req);
    const subscription = await service.create(req.body as CreateSubscriptionBody);
    responder.created(res, subscription);
  }),
];

export const updateSubscription = [
  validateParams(subscriptionIdParamSchema),
  validateBody(updateSubscriptionBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getSubscriptionService(req);
    const subscription = await service.update(req.params["id"] as string, req.body as UpdateSubscriptionBody);
    if (!subscription) throw new HttpApiError(404, "NOT_FOUND", "Subscription not found");
    responder.ok(res, subscription);
  }),
];

export const cancelSubscription = [
  validateParams(subscriptionIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getSubscriptionService(req);
    const subscription = await service.cancel(req.params["id"] as string);
    if (!subscription) throw new HttpApiError(404, "NOT_FOUND", "Subscription not found");
    responder.ok(res, subscription);
  }),
];
