// Express router: mounts all feature route modules under /api/v1.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerStatusRoutes } from "./features/status/status.routes.js";
import { registerIncidentsRoutes } from "./features/incidents/incidents.routes.js";
import { registerUptimeRoutes } from "./features/uptime/uptime.routes.js";
import { mountOpenApiRoutes } from "./openapi.js";
import { checkHealth } from "./health.js";
import { sendOk } from "./http/responder.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  mountOpenApiRoutes(router);

  router.get("/health", (_req, res, next) => {
    checkHealth(deps)
      .then((report) => sendOk(res, report))
      .catch(next);
  });

  router.get("/ready", (_req, res) => {
    sendOk(res, { ready: true, timestamp: new Date().toISOString() });
  });

  registerStatusRoutes(router, deps);
  registerIncidentsRoutes(router, deps);
  registerUptimeRoutes(router, deps);

  return router;
}
