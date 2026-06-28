// Webhooks BFF route: manage webhook endpoints and inspect delivery history.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";
import { z } from "zod";
import { toWebhookViewModel } from "../view-model.js";
import { BffValidationError } from "../errors.js";

interface WebhooksRouteDeps {
  readonly client: VeritasClient;
  readonly logger: Logger;
}

const createWebhookSchema = z.object({
  organizationId: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

export function registerWebhooksRoutes(router: Router, deps: WebhooksRouteDeps): void {
  const { client, logger } = deps;

  router.get("/webhooks", async (req, res, next) => {
    try {
      const limit = req.query["limit"] !== undefined ? Math.min(Number(req.query["limit"]), 100) : 20;
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;

      const page = await client.webhooks.list({ limit, cursor });
      const data = (page.data ?? []).map(toWebhookViewModel);
      res.json({ success: true, data, meta: page.meta });
    } catch (error) {
      logger.error("webhooks list failed", { error });
      next(error);
    }
  });

  router.post("/webhooks", async (req, res, next) => {
    try {
      const parsed = createWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid webhook payload");
      }

      const response = await client.webhooks.create(parsed.data);
      const webhook = (response as { data?: unknown }).data;
      res.status(201).json({ success: true, data: webhook != null ? toWebhookViewModel(webhook as Parameters<typeof toWebhookViewModel>[0]) : null });
    } catch (error) {
      logger.error("webhook create failed", { error });
      next(error);
    }
  });

  router.get("/webhooks/:webhookId", async (req, res, next) => {
    try {
      const { webhookId } = req.params as { webhookId: string };
      const response = await client.webhooks.get(webhookId);
      const webhook = (response as { data?: unknown }).data;
      res.json({ success: true, data: webhook != null ? toWebhookViewModel(webhook as Parameters<typeof toWebhookViewModel>[0]) : null });
    } catch (error) {
      logger.error("webhook get failed", { error, webhookId: req.params["webhookId"] });
      next(error);
    }
  });

  router.patch("/webhooks/:webhookId", async (req, res, next) => {
    try {
      const { webhookId } = req.params as { webhookId: string };
      const parsed = updateWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid webhook update payload");
      }

      const response = await client.webhooks.update(webhookId, parsed.data);
      const webhook = (response as { data?: unknown }).data;
      res.json({ success: true, data: webhook != null ? toWebhookViewModel(webhook as Parameters<typeof toWebhookViewModel>[0]) : null });
    } catch (error) {
      logger.error("webhook update failed", { error, webhookId: req.params["webhookId"] });
      next(error);
    }
  });

  router.delete("/webhooks/:webhookId", async (req, res, next) => {
    try {
      const { webhookId } = req.params as { webhookId: string };
      await client.webhooks.delete(webhookId);
      res.json({ success: true, data: null });
    } catch (error) {
      logger.error("webhook delete failed", { error, webhookId: req.params["webhookId"] });
      next(error);
    }
  });

  router.get("/webhooks/:webhookId/deliveries", async (req, res, next) => {
    try {
      const { webhookId } = req.params as { webhookId: string };
      const limit = req.query["limit"] !== undefined ? Math.min(Number(req.query["limit"]), 100) : 20;
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;
      const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;

      const page = await client.webhooks.listDeliveries(webhookId, { limit, cursor, status });
      res.json({ success: true, data: page.data ?? [], meta: page.meta });
    } catch (error) {
      logger.error("webhook deliveries list failed", { error, webhookId: req.params["webhookId"] });
      next(error);
    }
  });

  router.post("/webhooks/:webhookId/deliveries/:deliveryId/redeliver", async (req, res, next) => {
    try {
      const { webhookId, deliveryId } = req.params as { webhookId: string; deliveryId: string };
      const response = await client.webhooks.redeliver(webhookId, deliveryId);
      res.json({ success: true, data: (response as { data?: unknown }).data ?? null });
    } catch (error) {
      logger.error("webhook redeliver failed", { error, webhookId: req.params["webhookId"], deliveryId: req.params["deliveryId"] });
      next(error);
    }
  });
}
