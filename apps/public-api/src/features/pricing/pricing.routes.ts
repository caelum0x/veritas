// Pricing feature routes: mounts compute, estimate, table, quote, and catalog endpoints.
import { Router } from "express";
import { epochToIso, newId } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { PricingService, ApiKeyService } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import type { CatalogRepository, PromoCodeRepository } from "@veritas/pricing-engine";
import { InMemoryCatalogRepository, InMemoryPromoCodeRepository } from "@veritas/pricing-engine";
import { createAuthMiddleware } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import { PricingFeatureService } from "./pricing.service.js";
import { PricingController } from "./pricing.controller.js";

export interface PricingFeatureDeps {
  readonly pricingService: PricingService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
  readonly catalogRepository?: CatalogRepository;
  readonly promoCodeRepository?: PromoCodeRepository;
}

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export function registerPricingRoutes(router: Router, deps: PricingFeatureDeps): void {
  const catalogRepo = deps.catalogRepository ?? new InMemoryCatalogRepository();
  const promoRepo = deps.promoCodeRepository ?? new InMemoryPromoCodeRepository();

  const service = new PricingFeatureService({
    pricingService: deps.pricingService,
    catalogRepository: catalogRepo,
    promoCodeRepository: promoRepo,
  });

  const controller = new PricingController(service);

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey) => {
      const ctx = buildSystemContext();
      const result = await deps.apiKeyService.validateApiKey(ctx, { rawKey });
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
  });

  const rlRead = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:features:pricing:read:${(req as { orgId?: string }).orgId ?? req.ip}`,
  });

  const rlCompute = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:features:pricing:compute:${(req as { orgId?: string }).orgId ?? req.ip}`,
  });

  const featureRouter = Router();
  featureRouter.use(auth);

  featureRouter.post("/compute", rlCompute, controller.computePrice);
  featureRouter.post("/estimate", rlCompute, controller.estimateMonthly);
  featureRouter.post("/quote", rlCompute, controller.buildQuote);
  featureRouter.get("/catalog", rlRead, controller.listCatalog);
  featureRouter.get("/plans/:planId", rlRead, controller.getPricingTable);

  router.use("/pricing", featureRouter);
}
