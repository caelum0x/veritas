// Express router — mounts all feature route modules and system routes.

import { Router } from "express";
import type { Deps } from "./container.js";
import { healthHandler, livenessHandler, readinessHandler } from "./health.js";
import { asyncHandler } from "./http/async-handler.js";
import { buildOpenApiSpec } from "./openapi.js";
import { registerA2aRoutes } from "./features/a2a/a2a.routes.js";
import { registerAgentCardRoutes } from "./features/agent-card/agent-card.routes.js";
import { registerTasksRoutes } from "./features/tasks/tasks.routes.js";

/** Build and return a fully-wired Express Router. */
export function buildRouter(deps: Deps): Router {
  const router = Router();

  // System routes — unauthenticated
  router.get("/health", asyncHandler(healthHandler(deps.healthChecks)));
  router.get("/health/live", livenessHandler);
  router.get("/health/ready", asyncHandler(readinessHandler(deps.healthChecks)));

  router.get("/openapi.json", (_req, res) => {
    res.json(buildOpenApiSpec(deps.config));
  });

  // Feature routes
  registerA2aRoutes(router, deps);
  registerAgentCardRoutes(router, deps);
  registerTasksRoutes(router, deps);

  return router;
}
