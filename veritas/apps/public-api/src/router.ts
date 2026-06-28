// router.ts: mounts all feature route modules and legacy v1 sub-routers on the root express Router.
import { Router } from "express";
import type { AppConfig } from "@veritas/config";
import type { Logger } from "@veritas/observability";
import type { Deps } from "./container.js";
import { healthHandler, livenessHandler, readinessHandler } from "./health.js";
import { openApiDocument } from "./openapi.js";
import { V1_PREFIX, createV1Router } from "./versioning.js";

// Feature route registration functions (written by feature agents)
import { registerVerificationRoutes } from "./features/verification/verification.routes.js";
import { registerReportsRoutes } from "./features/reports/reports.routes.js";
import { registerUsageRoutes } from "./features/usage/usage.routes.js";
import { registerPricingRoutes } from "./features/pricing/pricing.routes.js";

export type RouterDeps = Deps;

/** Build the root Express router with all versioned feature routes mounted. */
export function buildRouter(deps: RouterDeps, _config?: AppConfig, _logger?: Logger): Router {
  const root = Router();

  // Redirect bare root to health endpoint
  root.get("/", (_req, res) => {
    res.redirect(301, `${V1_PREFIX}/health`);
  });

  // OpenAPI spec endpoint
  root.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  // Health endpoints at root level for load balancers
  root.get("/health", healthHandler);
  root.get("/health/live", livenessHandler);
  root.get("/health/ready", readinessHandler);

  // v1 router
  const v1 = createV1Router();

  // Health inside /v1
  v1.get("/health", healthHandler);
  v1.get("/health/live", livenessHandler);
  v1.get("/health/ready", readinessHandler);

  // Feature route modules
  registerVerificationRoutes(v1, deps);
  registerReportsRoutes(v1, deps);
  registerUsageRoutes(v1, deps);
  registerPricingRoutes(v1, deps);

  root.use(V1_PREFIX, v1);

  return root;
}
