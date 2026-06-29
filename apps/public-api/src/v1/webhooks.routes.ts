// v1 Webhooks routes: mount webhook CRUD and delivery history endpoints with auth and rate-limiting.
import { Router } from "express";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type WebhookService, type ApiKeyService } from "@veritas/services";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import type { RateLimiter } from "@veritas/rate-limit";
import { makeWebhooksController } from "./webhooks.controller.js";

export interface WebhooksRouterDeps {
  readonly webhookService: WebhookService;
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

export function webhooksRouter(deps: WebhooksRouterDeps): Router {
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

  const rlRead = createRateLimitMiddleware({ limiter: deps.rateLimiter, keyFn: (req) => `rl:v1:webhooks:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}` });
  const rlWrite = createRateLimitMiddleware({ limiter: deps.rateLimiter, keyFn: (req) => `rl:v1:webhooks:write:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}` });

  const ctrl = makeWebhooksController(deps.webhookService);

  router.use(auth);

  router.get("/", rlRead, ctrl.listWebhooks);
  router.post("/", rlWrite, ctrl.createWebhook);
  router.get("/:id", rlRead, ctrl.getWebhook);
  router.patch("/:id", rlWrite, ctrl.updateWebhook);
  router.delete("/:id", rlWrite, ctrl.deleteWebhook);
  router.get("/:id/deliveries", rlRead, ctrl.listDeliveries);
  router.post("/:id/deliveries/:deliveryId/retry", rlWrite, ctrl.retryDelivery);

  return router;
}
