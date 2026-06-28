// Subscription routes: mounts all subscription and plan endpoints on the provided router.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { SubscriptionService } from "./subscriptions.service.js";
import { SubscriptionsController } from "./subscriptions.controller.js";

export function registerSubscriptionsRoutes(router: Router, deps: Deps): void {
  const service = new SubscriptionService({
    logger: deps.logger,
    ledger: deps.ledger,
    dunningStore: deps.dunningStore,
    revenueStore: deps.revenueStore,
  });
  const ctrl = new SubscriptionsController(service);

  /** GET /subscriptions/plans — list billing plans */
  router.get("/subscriptions/plans", (req, res) => ctrl.listPlans(req, res));

  /** GET /subscriptions/plans/:planId — get a single plan */
  router.get("/subscriptions/plans/:planId", (req, res) => ctrl.getPlan(req, res));

  /** GET /subscriptions — list subscriptions with optional filters */
  router.get("/subscriptions", (req, res) => ctrl.listSubscriptions(req, res));

  /** POST /subscriptions — create a new subscription */
  router.post("/subscriptions", (req, res) => ctrl.createSubscription(req, res));

  /** GET /subscriptions/:subscriptionId — get a subscription by id */
  router.get("/subscriptions/:subscriptionId", (req, res) => ctrl.getSubscription(req, res));

  /** PATCH /subscriptions/:subscriptionId — update subscription status or plan */
  router.patch("/subscriptions/:subscriptionId", (req, res) =>
    ctrl.updateSubscription(req, res),
  );

  /** POST /subscriptions/:subscriptionId/cancel — cancel a subscription */
  router.post("/subscriptions/:subscriptionId/cancel", (req, res) =>
    ctrl.cancelSubscription(req, res),
  );
}
