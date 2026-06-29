// Usage feature routes: mounts CRUD + summarize + meter-flush endpoints under the given router.
import { Router } from "express";
import { epochToIso, newId } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { UsageMeteringService, ApiKeyService } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { UsageMeter } from "@veritas/usage-billing";
import { createAuthMiddleware, requireScope } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import { UsageService } from "./usage.service.js";
import { UsageController } from "./usage.controller.js";

export interface UsageFeatureDeps {
  readonly usageMeteringService: UsageMeteringService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
  readonly usageMeter?: UsageMeter;
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

export function registerUsageRoutes(router: Router, deps: UsageFeatureDeps): void {
  const meter = deps.usageMeter ?? new UsageMeter();

  const service = new UsageService({
    usageMeteringService: deps.usageMeteringService,
    usageMeter: meter,
  });

  const controller = new UsageController(service);

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
    keyFn: (req) => `rl:features:usage:read:${(req as { orgId?: string }).orgId ?? req.ip}`,
  });

  const rlWrite = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:features:usage:write:${(req as { orgId?: string }).orgId ?? req.ip}`,
  });

  const featureRouter = Router();
  featureRouter.use(auth);

  featureRouter.get("/", rlRead, controller.listUsage);
  featureRouter.post("/", rlWrite, requireScope("usage:write"), controller.recordUsage);
  featureRouter.get("/summarize", rlRead, controller.summarizeUsage);
  featureRouter.post("/meter/flush", rlWrite, requireScope("usage:admin"), controller.flushMeterEvents);
  featureRouter.get("/:id", rlRead, controller.getUsageById);

  router.use("/usage", featureRouter);
}
