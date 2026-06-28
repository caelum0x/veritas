// Router: mounts versioned API routes for DSR, consent, and retention features.

import { Router } from "express";
import type { Deps } from "./container.js";
import { makeHealthHandler, makeLivenessHandler } from "./health.js";
import { openApiSpec } from "./openapi.js";
import { registerDsrRoutes } from "./features/dsr/dsr.routes.js";
import { registerConsentRoutes } from "./features/consent/consent.routes.js";
import { registerRetentionRoutes } from "./features/retention/retention.routes.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  // Observability
  router.get("/livez", makeLivenessHandler());
  router.get("/healthz", makeHealthHandler(deps.healthChecks));
  router.get("/openapi.json", (_req, res) => res.json(openApiSpec));

  // Feature routes
  const v1 = Router();
  registerDsrRoutes(v1, deps);
  registerConsentRoutes(v1, deps);
  registerRetentionRoutes(v1, deps);

  router.use("/v1", v1);

  return router;
}
