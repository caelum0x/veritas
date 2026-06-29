// Mounts all feature routes on the v1 Express router.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerAppsRoutes } from "./features/apps/apps.routes.js";
import { registerKeysRoutes } from "./features/keys/keys.routes.js";
import { registerUsageRoutes } from "./features/usage/usage.routes.js";
import { registerPartnersRoutes } from "./features/partners/partners.routes.js";
import { UsageService } from "./features/usage/usage.service.js";
import { PartnersService } from "./features/partners/partners.service.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  // registerAppsRoutes and registerKeysRoutes each internally mount a sub-router
  // under /apps and /keys respectively, so we pass the root v1 router directly.
  registerAppsRoutes(router, deps);
  registerKeysRoutes(router, deps);

  // Usage feature — instantiate UsageService from package-level services
  const usageService = new UsageService({
    portalService: deps.portalService,
    analyticsStore: deps.analyticsStore,
    logger: deps.logger,
  });
  const usageRouter = Router();
  registerUsageRoutes(usageRouter, { usageService });
  router.use("/usage", usageRouter);

  // Partners feature — instantiate PartnersService from package-level PartnerService
  const partnersService = new PartnersService({
    partnerService: deps.partnerService,
    logger: deps.logger,
  });
  const partnersRouter = Router();
  registerPartnersRoutes(partnersRouter, { partnersService });
  router.use("/partners", partnersRouter);

  return router;
}

/** @deprecated use buildRouter — kept for backward compat with legacy index */
export function mountRouter(
  _app: import("express").Express,
  _deps: { portalService: import("@veritas/developer-portal").PortalService; logger: import("@veritas/observability").Logger },
): void {
  // no-op: replaced by buildRouter
}
