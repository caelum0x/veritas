// Mount all BFF route groups onto a single Express Router.
import { Router } from "express";
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";
import { registerVerifyRoutes } from "./routes/verify.routes.js";
import { registerReportsRoutes } from "./routes/reports.routes.js";
import type { VeritasUpstream } from "./upstream.js";

export interface RouterDeps {
  readonly client: VeritasClient;
  readonly upstream: VeritasUpstream;
  readonly logger: Logger;
}

/** Build and return the root BFF router with all sub-routes mounted. */
export function buildBffRouter(deps: RouterDeps): Router {
  const router = Router();

  // Health liveness probe — no auth required.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "bff", timestamp: new Date().toISOString() });
  });

  // Feature routes
  registerDashboardRoutes(router, { client: deps.client, logger: deps.logger });
  registerVerifyRoutes(router, { client: deps.client, logger: deps.logger });
  registerReportsRoutes(router, { client: deps.client, logger: deps.logger });

  return router;
}
