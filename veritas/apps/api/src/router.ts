// Top-level router: mounts every feature register fn and cross-cutting routes under /v1.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerHealthRoutes } from "./health.js";
import { registerOpenApiRoute } from "./openapi.js";
import { registerVerificationJobsRoutes } from "./features/verification-jobs/verification-jobs.routes.js";
import { registerReportsRoutes } from "./features/reports/reports.routes.js";
import { registerOrdersRoutes } from "./features/orders/orders.routes.js";
import { registerAgentsRoutes } from "./features/agents/agents.routes.js";
import { registerWalletsRoutes } from "./features/wallets/wallets.routes.js";
import { registerUsageRoutes } from "./features/usage/usage.routes.js";
import { registerWebhooksRoutes } from "./features/webhooks/webhooks.routes.js";

export function buildRouter(deps: Deps): Router {
  const root   = Router();
  const v1     = Router();

  // Cross-cutting routes (no versioning prefix)
  registerHealthRoutes(root, deps);
  registerOpenApiRoute(root);

  // Feature routes
  registerVerificationJobsRoutes(v1, deps);
  registerReportsRoutes(v1, deps);
  registerOrdersRoutes(v1, deps);
  registerAgentsRoutes(v1, deps);
  registerWalletsRoutes(v1, deps);
  registerUsageRoutes(v1, deps);
  registerWebhooksRoutes(v1, deps);

  root.use("/v1", v1);
  return root;
}
