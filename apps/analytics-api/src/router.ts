// Router — mounts all feature route groups under /v1.
import { Router } from "express";
import { registerQueriesRoutes } from "./features/queries/queries.routes.js";
import { registerReportsRoutes } from "./features/reports/reports.routes.js";
import { registerDashboardsRoutes } from "./features/dashboards/dashboards.routes.js";
import { registerMetricsRoutes } from "./features/metrics/metrics.routes.js";
import type { Deps } from "./container.js";

/** Build and return the versioned Express router with all feature routes mounted. */
export function buildRouter(deps: Deps): Router {
  const router = Router();

  // Flat-path features (register their own full paths onto the router)
  registerQueriesRoutes(router, deps);
  registerReportsRoutes(router, deps);

  // Sub-router features (register relative paths; mount under a prefix)
  const dashboardsRouter = Router();
  registerDashboardsRoutes(dashboardsRouter, deps);
  router.use("/dashboards", dashboardsRouter);

  const metricsRouter = Router();
  registerMetricsRoutes(metricsRouter, deps);
  router.use("/metrics", metricsRouter);

  return router;
}
