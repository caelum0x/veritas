// Registers deliveries REST routes on the given Express router.

import { Router } from "express";
import type { Deps } from "../../container.js";
import { DeliveriesService } from "./deliveries.service.js";
import { DeliveriesController } from "./deliveries.controller.js";

export function registerDeliveriesRoutes(router: Router, deps: Deps): void {
  const service = new DeliveriesService({
    deliveryTracker: deps.deliveryTracker,
    webhookRegistry: deps.webhookRegistry,
    logger: deps.logger,
  });

  const controller = new DeliveriesController(service);

  // GET /deliveries?subscriptionId=<id>&limit=<n>
  router.get("/deliveries", controller.listBySubscription);

  // GET /deliveries/:deliveryId
  router.get("/deliveries/:deliveryId", controller.getById);

  // POST /deliveries/retry
  router.post("/deliveries/retry", controller.retryDelivery);
}
