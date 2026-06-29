// Top-level router: mounts every feature register fn and cross-cutting routes under /v1.
import { Router } from "express";
import type { Deps } from "./container.js";
import { makeServiceContext } from "@veritas/services";
import { epochToIso, newId } from "@veritas/core";
import { registerHealthRoutes } from "./health.js";
import { registerOpenApiRoute } from "./openapi.js";
import { registerVerificationJobsRoutes } from "./features/verification-jobs/verification-jobs.routes.js";
import { registerReportsRoutes } from "./features/reports/reports.routes.js";
import { registerOrdersRoutes } from "./features/orders/orders.routes.js";
import { registerAgentsRoutes } from "./features/agents/agents.routes.js";
import { registerWalletsRoutes } from "./features/wallets/wallets.routes.js";
import { registerUsageRoutes } from "./features/usage/usage.routes.js";
import { registerWebhooksRoutes } from "./features/webhooks/webhooks.routes.js";

export function buildRouter(deps: Deps): Router {
  const root   = Router();
  const v1     = Router();

  const apiKeyAuthService = {
    validateApiKey: async (rawKey: string) => {
      const reqId = newId("sys");
      const ctx = makeServiceContext(
        { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
        reqId,
        reqId,
        epochToIso(Date.now()),
      );
      const result = await deps.apiKeySvc.validateApiKey(ctx, { rawKey });
      if (!result.ok || !result.value.valid || result.value.apiKey === null) return null;
      const key = result.value.apiKey;
      return {
        apiKeyId: key.id,
        orgId: key.organizationId ?? "",
        userId: key.userId ?? undefined,
        scopes: key.scopes ?? [],
        active: key.revokedAt === null || key.revokedAt === undefined,
      };
    },
  };

  // Cross-cutting routes (no versioning prefix)
  registerHealthRoutes(root, deps);
  registerOpenApiRoute(root);

  // Feature routes
  registerVerificationJobsRoutes(v1, {
    verificationJobService: deps.verificationJobSvc,
    logger: deps.logger,
    apiKeyService: apiKeyAuthService,
  });
  registerReportsRoutes(v1, {
    reportService: deps.reportSvc,
    logger: deps.logger,
    apiKeyService: apiKeyAuthService,
  });
  registerOrdersRoutes(v1, deps.container);
  registerAgentsRoutes(v1, deps.container);
  registerWalletsRoutes(v1, { container: deps.container });
  registerUsageRoutes(v1, { container: deps.container });
  registerWebhooksRoutes(v1, deps.container);

  root.use("/v1", v1);
  return root;
}
