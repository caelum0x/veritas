// Webhook HTTP controllers: validate requests, call service functions, map to responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { WebhookDeliveryOutput } from "@veritas/services/webhook/webhook.dto.js";
import { asyncHandler } from "../../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondError } from "../../http/responder.js";
import { toHttpError } from "../../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  createWebhookBodySchema,
  updateWebhookBodySchema,
  listWebhooksQuerySchema,
  webhookIdParamSchema,
  webhookDeliveryIdParamSchema,
  listDeliveriesQuerySchema,
  type CreateWebhookBody,
  type UpdateWebhookBody,
  type ListWebhooksQuery,
  type ListDeliveriesQuery,
  type WebhookIdParam,
  type WebhookDeliveryIdParam,
} from "./webhooks.schema.js";
import {
  createWebhook,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  listWebhookDeliveries,
  retryWebhookDelivery,
  type WebhooksDeps,
} from "./webhooks.service.js";
import {
  toWebhookResponse,
  toWebhookDeliveryResponse,
  toWebhookPageItems,
  toDeliveryPageItems,
} from "./webhooks.mapper.js";

type AuthReq = AuthenticatedRequest;

function handleErr(res: Response, error: unknown): void {
  const httpErr = toHttpError(error as import("@veritas/core").AppError);
  respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
}

/** POST /webhooks — register a new webhook endpoint. */
export function makeCreateWebhookHandler(deps: WebhooksDeps) {
  return [
    validateBody(createWebhookBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const result = await createWebhook(deps, req as AuthReq, req.body as CreateWebhookBody);
      if (isErr(result)) return handleErr(res, result.error);
      return respondCreated(res, toWebhookResponse(result.value));
    }),
  ];
}

/** GET /webhooks — list webhooks with optional filters. */
export function makeListWebhooksHandler(deps: WebhooksDeps) {
  return [
    validateQuery(listWebhooksQuerySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const query = req.query as unknown as ListWebhooksQuery;
      const result = await listWebhooks(deps, req as AuthReq, {
        enabled: query.enabled,
        limit: query.limit,
        cursor: query.cursor,
      });
      if (isErr(result)) return handleErr(res, result.error);
      const page = toWebhookPageItems(result.value);
      res.status(200).json({ success: true, data: page.items, meta: { nextCursor: page.nextCursor, total: page.total, hasMore: page.nextCursor !== null } });
    }),
  ];
}

/** GET /webhooks/:id — get a single webhook by ID. */
export function makeGetWebhookHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as WebhookIdParam;
      const result = await getWebhookById(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toWebhookResponse(result.value));
    }),
  ];
}

/** PATCH /webhooks/:id — update mutable fields of a webhook. */
export function makeUpdateWebhookHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookIdParamSchema),
    validateBody(updateWebhookBodySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as WebhookIdParam;
      const result = await updateWebhook(deps, req as AuthReq, id, req.body as UpdateWebhookBody);
      if (isErr(result)) return handleErr(res, result.error);
      return respondOk(res, toWebhookResponse(result.value));
    }),
  ];
}

/** DELETE /webhooks/:id — delete (unregister) a webhook. */
export function makeDeleteWebhookHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as WebhookIdParam;
      const result = await deleteWebhook(deps, req as AuthReq, id);
      if (isErr(result)) return handleErr(res, result.error);
      return respondNoContent(res);
    }),
  ];
}

/** GET /webhooks/:id/deliveries — list deliveries for a webhook. */
export function makeListDeliveriesHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookIdParamSchema),
    validateQuery(listDeliveriesQuerySchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params as WebhookIdParam;
      const query = req.query as unknown as ListDeliveriesQuery;
      const result = await listWebhookDeliveries(deps, req as AuthReq, {
        webhookId: id,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      });
      if (isErr(result)) return handleErr(res, result.error);
      const page = toDeliveryPageItems(result.value);
      res.status(200).json({ success: true, data: page.items, meta: { nextCursor: page.nextCursor, total: page.total, hasMore: page.nextCursor !== null } });
    }),
  ];
}

/** GET /webhooks/:id/deliveries/:deliveryId — get a single delivery attempt. */
export function makeGetDeliveryHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookDeliveryIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { id, deliveryId } = req.params as WebhookDeliveryIdParam;
      const result = await listWebhookDeliveries(deps, req as AuthReq, { webhookId: id, limit: 100 });
      if (isErr(result)) return handleErr(res, result.error);
      const delivery = result.value.items.find((d: WebhookDeliveryOutput) => d.id === deliveryId);
      if (!delivery) {
        return respondError(res, 404, "NOT_FOUND", `Webhook delivery not found: ${deliveryId}`);
      }
      return respondOk(res, toWebhookDeliveryResponse(delivery));
    }),
  ];
}

/** POST /webhooks/:id/deliveries/:deliveryId/retry — retry a failed delivery. */
export function makeRetryDeliveryHandler(deps: WebhooksDeps) {
  return [
    validateParams(webhookDeliveryIdParamSchema),
    asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
      const { deliveryId } = req.params as WebhookDeliveryIdParam;
      const result = await retryWebhookDelivery(deps, req as AuthReq, deliveryId);
      if (isErr(result)) return handleErr(res, result.error);
      return respondCreated(res, toWebhookDeliveryResponse(result.value));
    }),
  ];
}
