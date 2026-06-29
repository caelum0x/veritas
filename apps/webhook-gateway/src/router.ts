// Main Express router — mounts all feature routes and system endpoints.

import { Router } from "express";
import type { Deps } from "./container.js";
import { createHealthHandler } from "./health.js";
import { openApiSpec } from "./openapi.js";
import { registerInboundRoutes } from "./features/inbound/inbound.routes.js";
import { registerSubscriptionsRoutes } from "./features/subscriptions/subscriptions.routes.js";
import { registerDeliveriesRoutes } from "./features/deliveries/deliveries.routes.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  // System endpoints
  router.get("/health", createHealthHandler(deps));
  router.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  // Feature routes
  registerInboundRoutes(router, deps);
  registerSubscriptionsRoutes(router, deps);
  registerDeliveriesRoutes(router, deps);

  return router;
}
