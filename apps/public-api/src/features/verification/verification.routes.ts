// Registers verification feature routes on the supplied Express router with auth + rate-limit middleware.
import { Router } from "express";
import { VerificationJobService, ApiKeyService, makeServiceContext } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { epochToIso, newId } from "@veritas/core";
import { createAuthMiddleware } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import { VerificationService } from "./verification.service.js";
import { VerificationFeatureController } from "./verification.controller.js";

/** Subset of the app Deps consumed by this feature. */
export interface VerificationRouteDeps {
  readonly verificationJobService: VerificationJobService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
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

/**
 * Mount verification endpoints under the provided router.
 * Expects the router to already be mounted at /verifications.
 */
export function registerVerificationRoutes(
  router: Router,
  deps: VerificationRouteDeps,
): void {
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

  const rlWrite = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) =>
      `rl:v1:verification:write:${(req as { apiKeyId?: string }).apiKeyId ?? req.ip}`,
  });

  const rlRead = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) =>
      `rl:v1:verification:read:${(req as { apiKeyId?: string }).apiKeyId ?? req.ip}`,
  });

  const svc = new VerificationService({
    verificationJobService: deps.verificationJobService,
  });

  const ctrl = new VerificationFeatureController({ verificationService: svc });

  router.use(auth);
  router.post("/", rlWrite, ctrl.submit);
  router.get("/", rlRead, ctrl.list);
  router.get("/:jobId", rlRead, ctrl.get);
  router.delete("/:jobId", rlWrite, ctrl.cancel);
}
