// Router: mounts all feature route registrations under their canonical prefixes.

import { Router } from "express";
import type { Deps } from "./container.js";
import { createHealthHandler } from "./health.js";
import { openApiSpec } from "./openapi.js";
import { registerLoginRoutes } from "./features/login/login.routes.js";
import { registerSsoRoutes } from "./features/sso/sso.routes.js";
import { registerMfaRoutes } from "./features/mfa/mfa.routes.js";
import { registerSessionsRoutes } from "./features/sessions/sessions.routes.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  // Liveness / readiness probes
  router.get("/health", createHealthHandler(deps.healthChecks));

  // OpenAPI spec document
  router.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  // Login feature — expects LoginDeps shape
  registerLoginRoutes(router, {
    credentialVerifier: deps.credentialVerifier,
    tokenConfig: deps.tokenConfig,
    logger: deps.logger,
  });

  // SSO feature — expects SsoDeps shape
  registerSsoRoutes(router, {
    providerRegistry: deps.providerRegistry,
    stateStore: deps.stateStore,
    userProvisionPort: deps.userProvisionPort,
    tokenConfig: deps.tokenConfig,
    logger: deps.logger,
  });

  // MFA feature — receives full Deps
  registerMfaRoutes(router, deps);

  // Sessions feature — receives full Deps
  registerSessionsRoutes(router, deps);

  return router;
}

// Backwards-compatible export kept for thin MVP code.
export { buildRouter as createRouter };
