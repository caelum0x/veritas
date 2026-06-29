// Controller handlers for webhook CRUD and delivery history operations
import type { Request, Response } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { responder } from "../http/responder.js";
import { HttpApiError } from "../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import {
  createWebhookBodySchema,
  updateWebhookBodySchema,
  listWebhooksQuerySchema,
  webhookIdParamSchema,
  webhookDeliveryIdParamSchema,
} from "../validators/webhook.validator.js";
import type { CreateWebhookBody, UpdateWebhookBody } from "../validators/webhook.validator.js";
import { toPageRequest } from "@veritas/core";

function getWebhookService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = (req as any).container;
  if (!container || typeof container.webhookService === "undefined") {
    throw new HttpApiError(503, "SERVICE_UNAVAILABLE", "Webhook service not available");
  }
  return container.webhookService as {
    create(data: CreateWebhookBody): Promise<unknown>;
    findById(id: string): Promise<unknown | null>;
    update(id: string, data: UpdateWebhookBody): Promise<unknown | null>;
    delete(id: string): Promise<boolean>;
    list(query: Record<string, unknown>): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
    listDeliveries(webhookId: string, pageReq: Record<string, unknown>): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
    getDelivery(webhookId: string, deliveryId: string): Promise<unknown | null>;
    redeliver(webhookId: string, deliveryId: string): Promise<unknown | null>;
  };
}

export const listWebhooks = [
  validateQuery(listWebhooksQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const { limit, cursor, organizationId, active } = req.query as Record<string, string | undefined>;
    const pageReq = toPageRequest({ limit: limit ? Number(limit) : undefined, cursor });
    const result = await service.list({ ...pageReq, organizationId, active } as Record<string, unknown>);
    responder.page(res, { items: result.items, nextCursor: null, hasMore: false });
  }),
];

export const getWebhook = [
  validateParams(webhookIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const webhook = await service.findById(req.params["id"] as string);
    if (!webhook) throw new HttpApiError(404, "NOT_FOUND", "Webhook not found");
    responder.ok(res, webhook);
  }),
];

export const createWebhook = [
  validateBody(createWebhookBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const webhook = await service.create(req.body as CreateWebhookBody);
    responder.created(res, webhook);
  }),
];

export const updateWebhook = [
  validateParams(webhookIdParamSchema),
  validateBody(updateWebhookBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const webhook = await service.update(req.params["id"] as string, req.body as UpdateWebhookBody);
    if (!webhook) throw new HttpApiError(404, "NOT_FOUND", "Webhook not found");
    responder.ok(res, webhook);
  }),
];

export const deleteWebhook = [
  validateParams(webhookIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const deleted = await service.delete(req.params["id"] as string);
    if (!deleted) throw new HttpApiError(404, "NOT_FOUND", "Webhook not found");
    responder.noContent(res);
  }),
];

export const listWebhookDeliveries = [
  validateParams(webhookIdParamSchema),
  validateQuery(listWebhooksQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const { limit, cursor } = req.query as Record<string, string | undefined>;
    const pageReq = toPageRequest({ limit: limit ? Number(limit) : undefined, cursor });
    const result = await service.listDeliveries(req.params["id"] as string, pageReq as unknown as Record<string, unknown>);
    responder.page(res, { items: result.items, nextCursor: null, hasMore: false });
  }),
];

export const getWebhookDelivery = [
  validateParams(webhookDeliveryIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const delivery = await service.getDelivery(req.params["id"] as string, req.params["deliveryId"] as string);
    if (!delivery) throw new HttpApiError(404, "NOT_FOUND", "Webhook delivery not found");
    responder.ok(res, delivery);
  }),
];

export const redeliverWebhook = [
  validateParams(webhookDeliveryIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getWebhookService(req);
    const delivery = await service.redeliver(req.params["id"] as string, req.params["deliveryId"] as string);
    if (!delivery) throw new HttpApiError(404, "NOT_FOUND", "Webhook delivery not found");
    responder.created(res, delivery);
  }),
];
