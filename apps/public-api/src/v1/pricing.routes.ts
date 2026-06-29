// v1 Pricing routes: compute price, estimate monthly cost, and retrieve plan pricing tables.
import { Router } from "express";
import { epochToIso, newId } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type PricingService } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import { makePricingController } from "./pricing.controller.js";

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export interface PricingRouterDeps {
  readonly pricingService: PricingService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
}

export function pricingRouter(deps: PricingRouterDeps): Router {
  const router = Router();

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey: string) => {
      const ctx = buildSystemContext();
      const result = await deps.apiKeyService.validateApiKey(ctx, { rawKey });
      if (!result.ok || !result.value.valid || result.value.apiKey === null) {
        return null;
      }
      const key = result.value.apiKey;
      return {
        apiKeyId: key.id,
        orgId: key.organizationId ?? "",
        userId: key.userId ?? undefined,
        scopes: key.scopes ?? [],
        active: key.revokedAt === null || key.revokedAt === undefined,
      };
    },
  });

  const rl60 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:pricing:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const rl30 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:pricing:compute:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const ctrl = makePricingController(deps.pricingService);

  router.use(auth);
  router.post("/compute", rl30, ctrl.computePrice);
  router.post("/estimate", rl30, ctrl.estimateMonthly);
  router.get("/plans/:planId", rl60, ctrl.getPricingTable);

  return router;
}
