// subscriptions.routes.ts: mount subscription plan endpoints under /subscriptions.

import { Router } from "express";
import { SubscriptionsController } from "../controllers/subscriptions.controller.js";

export function subscriptionsRouter(): Router {
  const router = Router();
  const ctrl = new SubscriptionsController();

  /** GET /subscriptions/plans — list all active plans */
  router.get("/plans", (req, res) => ctrl.listPlans(req, res));

  /** GET /subscriptions/plans/:planId — fetch a single plan by ID */
  router.get("/plans/:planId", (req, res) => ctrl.getPlan(req, res));

  return router;
}
