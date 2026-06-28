// Mounts all feature sub-routers under the /api/v1 prefix.
import { Router } from "express";
import type { Deps } from "./container.js";
import { livenessHandler, buildReadinessHandler } from "./health.js";
import { registerTenantsRoutes } from "./features/tenants/tenants.routes.js";
import { registerUsersRoutes } from "./features/users/users.routes.js";
import { registerRolesRoutes } from "./features/roles/roles.routes.js";
import { registerPlansRoutes } from "./features/plans/plans.routes.js";
import { registerAgentsRoutes } from "./features/agents/agents.routes.js";
import { registerAuditLogsRoutes } from "./features/audit-logs/audit-logs.routes.js";

/** Build and return the full application router. */
export function buildRouter(deps: Deps): Router {
  const router = Router();

  // Health probes — unauthenticated
  router.get("/health", livenessHandler);
  router.get("/health/ready", buildReadinessHandler(deps));

  // OpenAPI spec endpoint
  router.get("/openapi.json", (_req, res) => {
    import("./openapi.js").then(({ buildOpenApiSpec }) => {
      res.json(buildOpenApiSpec());
    }).catch(() => res.status(500).json({ error: "Failed to load spec" }));
  });

  // Feature routes mounted under /api/v1
  const apiRouter = Router();
  registerTenantsRoutes(apiRouter, deps);
  registerUsersRoutes(apiRouter, deps);
  registerRolesRoutes(apiRouter, deps);
  registerPlansRoutes(apiRouter, deps);
  registerAgentsRoutes(apiRouter, deps);
  registerAuditLogsRoutes(apiRouter, deps);

  router.use("/api/v1", apiRouter);

  return router;
}
