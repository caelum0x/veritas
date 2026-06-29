// BFF billing route: exposes invoices, subscriptions, and plans aggregated for the UI.
import { z } from "zod";
import type { Logger } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";

interface BillingDeps {
  client: VeritasClient;
  logger: Logger;
}

const CreateSubscriptionBodySchema = z.object({
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
});

const UpdateSubscriptionBodySchema = z.object({
  planId: z.string().min(1).optional(),
  billingInterval: z.enum(["monthly", "annual"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function registerBillingRoutes(router: Router, deps: BillingDeps): void {
  const { client, logger } = deps;

  // Plans
  router.get("/billing/plans", async (req, res, next) => {
    try {
      const plans = await client.plans.list();
      res.json({ success: true, data: plans });
    } catch (err) {
      logger.error("list plans error", { error: err });
      next(err);
    }
  });

  router.get("/billing/plans/:planId", async (req, res, next) => {
    try {
      const { planId } = req.params;
      const plan = await client.plans.get(planId);
      res.json({ success: true, data: plan });
    } catch (err) {
      logger.error("get plan error", { error: err, planId: req.params["planId"] });
      next(err);
    }
  });

  // Subscriptions
  router.get("/billing/subscriptions", async (req, res, next) => {
    try {
      const organizationId =
        typeof req.query["organizationId"] === "string" ? req.query["organizationId"] : undefined;
      const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
      const limit = Math.min(Number(req.query["limit"] ?? 20), 100);

      const subs = await client.subscriptions.list({ organizationId, status, limit });
      res.json({ success: true, data: subs });
    } catch (err) {
      logger.error("list subscriptions error", { error: err });
      next(err);
    }
  });

  router.post("/billing/subscriptions", async (req, res, next) => {
    try {
      const parsed = CreateSubscriptionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError({
          message: "invalid subscription creation body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      const sub = await client.subscriptions.create(parsed.data);
      logger.info("subscription created", { planId: parsed.data.planId });
      res.status(201).json({ success: true, data: sub });
    } catch (err) {
      logger.error("create subscription error", { error: err });
      next(err);
    }
  });

  router.patch("/billing/subscriptions/:subscriptionId", async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      const parsed = UpdateSubscriptionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError({
          message: "invalid subscription update body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      const sub = await client.subscriptions.update(subscriptionId, parsed.data);
      res.json({ success: true, data: sub });
    } catch (err) {
      logger.error("update subscription error", { error: err, subscriptionId: req.params["subscriptionId"] });
      next(err);
    }
  });

  router.delete("/billing/subscriptions/:subscriptionId", async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      await client.subscriptions.cancel(subscriptionId);
      logger.info("subscription cancelled", { subscriptionId });
      res.status(204).send();
    } catch (err) {
      logger.error("cancel subscription error", { error: err, subscriptionId: req.params["subscriptionId"] });
      next(err);
    }
  });

  // Invoices
  router.get("/billing/invoices", async (req, res, next) => {
    try {
      const organizationId =
        typeof req.query["organizationId"] === "string" ? req.query["organizationId"] : undefined;
      const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
      const limit = Math.min(Number(req.query["limit"] ?? 20), 100);

      const invoices = await client.invoices.list({ organizationId, status, limit });
      res.json({ success: true, data: invoices });
    } catch (err) {
      logger.error("list invoices error", { error: err });
      next(err);
    }
  });

  router.get("/billing/invoices/:invoiceId", async (req, res, next) => {
    try {
      const { invoiceId } = req.params;
      const invoice = await client.invoices.get(invoiceId);
      res.json({ success: true, data: invoice });
    } catch (err) {
      logger.error("get invoice error", { error: err, invoiceId: req.params["invoiceId"] });
      next(err);
    }
  });

  router.get("/billing/invoices/:invoiceId/download", async (req, res, next) => {
    try {
      const { invoiceId } = req.params;
      const downloadInfo = await client.invoices.download(invoiceId);
      res.json({ success: true, data: downloadInfo });
    } catch (err) {
      logger.error("download invoice error", { error: err, invoiceId: req.params["invoiceId"] });
      next(err);
    }
  });
}
