// Mounts subscription management routes onto the provided Express router.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { SubscriptionsController } from "./subscriptions.controller.js";

/** Registers full CRUD routes for webhook subscriptions under /subscriptions. */
export function registerSubscriptionsRoutes(router: Router, deps: Deps): void {
  const ctrl = new SubscriptionsController(deps);

  // POST   /subscriptions          — create a new webhook subscription
  router.post("/subscriptions", (req, res) => {
    void ctrl.create(req, res);
  });

  // GET    /subscriptions          — list subscriptions for an organization (?organizationId=)
  router.get("/subscriptions", (req, res) => {
    void ctrl.list(req, res);
  });

  // GET    /subscriptions/:id      — fetch a single subscription by id
  router.get("/subscriptions/:id", (req, res) => {
    void ctrl.getById(req, res);
  });

  // PATCH  /subscriptions/:id      — update url, secret, eventTypes, or active flag
  router.patch("/subscriptions/:id", (req, res) => {
    void ctrl.update(req, res);
  });

  // DELETE /subscriptions/:id      — remove a subscription permanently
  router.delete("/subscriptions/:id", (req, res) => {
    void ctrl.remove(req, res);
  });
}
