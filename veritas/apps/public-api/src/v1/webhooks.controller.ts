// v1 Webhooks controller: CRUD for webhook endpoints and delivery history access.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type WebhookService } from "@veritas/services";
import type { Principal } from "@veritas/auth";
import { ApiError } from "../http/api-error.js";

type AuthedRequest = Request & { principal?: Principal };

const createWebhookBodySchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16).optional(),
  events: z.array(z.string().min(1)).min(1),
  enabled: z.boolean().default(true),
  description: z.string().max(256).optional(),
});

const updateWebhookBodySchema = z.object({
  url: z.string().url().optional(),
  secret: z.string().min(16).optional(),
  events: z.array(z.string().min(1)).optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(256).optional(),
});

const listDeliveriesQuerySchema = z.object({
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listWebhooksQuerySchema = z.object({
  enabled: z.enum(["true", "false"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function buildContext(req: AuthedRequest) {
  const principal = req.principal;
  if (!principal) throw ApiError.unauthorized();
  const requestId = newId("req");
  const now = epochToIso(Date.now());
  return {
    ctx: makeServiceContext(
      { userId: principal.userId ?? principal.id, orgId: principal.orgId, roles: [], apiKeyId: principal.kind === "api_key" ? principal.id : undefined },
      requestId,
      requestId,
      now,
    ),
    orgId: principal.orgId,
  };
}

export function makeWebhooksController(webhookService: WebhookService) {
  const createWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const parsed = createWebhookBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await webhookService.create(ctx, { ...parsed.data, organizationId: orgId } as Parameters<typeof webhookService.create>[1]);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const listWebhooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const parsed = listWebhooksQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }
      const { enabled, cursor, limit } = parsed.data;
      const result = await webhookService.list(ctx, {
        orgId,
        enabled: enabled === undefined ? undefined : enabled === "true",
        cursor,
        limit,
      });
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      const out = result.value;
      res.status(200).json({
        success: true,
        data: out.items,
        meta: { nextCursor: out.nextCursor ?? null, hasMore: out.nextCursor !== null, total: out.total },
      });
    } catch (err) {
      next(err);
    }
  };

  const getWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const result = await webhookService.getById(ctx, id);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const updateWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const parsed = updateWebhookBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await webhookService.update(ctx, id, parsed.data as Parameters<typeof webhookService.update>[2]);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const deleteWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const result = await webhookService.delete(ctx, id);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  const listDeliveries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx } = buildContext(req as AuthedRequest);
      const webhookId = req.params["id"];
      if (!webhookId) { next(ApiError.badRequest("Missing id")); return; }
      const parsed = listDeliveriesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }
      const result = await webhookService.listDeliveries(ctx, { webhookId, ...parsed.data } as Parameters<typeof webhookService.listDeliveries>[1]);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      const out = result.value;
      res.status(200).json({
        success: true,
        data: out.items,
        meta: { nextCursor: out.nextCursor ?? null, hasMore: out.nextCursor !== null, total: out.total },
      });
    } catch (err) {
      next(err);
    }
  };

  const retryDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx } = buildContext(req as AuthedRequest);
      const deliveryId = req.params["deliveryId"];
      if (!deliveryId) { next(ApiError.badRequest("Missing deliveryId")); return; }
      const result = await webhookService.retryDelivery(ctx, { deliveryId });
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  return { createWebhook, listWebhooks, getWebhook, updateWebhook, deleteWebhook, listDeliveries, retryDelivery };
}
