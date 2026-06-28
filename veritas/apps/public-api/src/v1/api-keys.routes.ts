// v1 API Keys routes: issue, list, retrieve, and revoke API keys for the caller's organization.
import { Router } from "express";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService } from "@veritas/services";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import type { RateLimiter } from "@veritas/rate-limit";
import { makeApiKeysController } from "./api-keys.controller.js";

export interface ApiKeysRouterDeps {
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

export function apiKeysRouter(deps: ApiKeysRouterDeps): Router {
  const router = Router();

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey: string) => {
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

  const rlRead = createRateLimitMiddleware({ limiter: deps.rateLimiter, keyFn: (req) => `rl:v1:apikeys:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}` });
  const rlWrite = createRateLimitMiddleware({ limiter: deps.rateLimiter, keyFn: (req) => `rl:v1:apikeys:write:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}` });

  const ctrl = makeApiKeysController(deps.apiKeyService);

  router.use(auth);

  router.get("/", rlRead, ctrl.listApiKeys);
  router.post("/", rlWrite, ctrl.issueApiKey);
  router.get("/:id", rlRead, ctrl.getApiKey);
  router.post("/:id/revoke", rlWrite, ctrl.revokeApiKey);

  return router;
}
