// Mounts all feature routers under the ops-api base path.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerIncidentsRoutes } from "./features/incidents/incidents.routes.js";
import { registerSloRoutes } from "./features/slo/slo.routes.js";
import { registerCostRoutes } from "./features/cost/cost.routes.js";
import { registerCapacityRoutes } from "./features/capacity/capacity.routes.js";
import { handleHealthRequest, handleLiveness } from "./health.js";
import { handleOpenApiDoc } from "./openapi.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  router.get("/openapi.json", handleOpenApiDoc);
  router.get("/livez", handleLiveness);
  router.get("/health", (req, res) =>
    handleHealthRequest(deps.healthChecks, req, res),
  );

  registerIncidentsRoutes(router, deps);
  registerSloRoutes(router, deps);
  registerCostRoutes(router, deps);
  registerCapacityRoutes(router, deps);

  return router;
}
