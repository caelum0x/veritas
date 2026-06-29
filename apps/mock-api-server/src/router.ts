// Mounts all feature route modules onto a single Express Router instance.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerMocksRoutes } from "./features/mocks/mocks.routes.js";
import { registerOpenApiRoute } from "./openapi.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();
  registerOpenApiRoute(router);
  registerMocksRoutes(router, deps);
  return router;
}
