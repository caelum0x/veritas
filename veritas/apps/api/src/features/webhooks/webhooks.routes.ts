// Webhooks feature router: mounts all webhook endpoints with auth and rate limiting.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { API_KEY_SVC } from "@veritas/container/tokens";
import type { ApiKeyService } from "@veritas/services";
import { makeServiceContext, epochToIso, newId } from "@veritas/services";
import { createAuthMiddleware, requireScope } from "../../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../../middleware/rate-limit.js";
import { resolveWebhooksDeps } from "./webhooks.service.js";
import {
  makeCreateWebhookHandler,
  makeListWebhooksHandler,
  makeGetWebhookHandler,
  makeUpdateWebhookHandler,
  makeDeleteWebhookHandler,
  makeListDeliveriesHandler,
  makeGetDeliveryHandler,
  makeRetryDeliveryHandler,
} from "./webhooks.controller.js";

const store = new InMemoryRateLimitStore();

/** Register all /webhooks routes on the given router. */
export function registerWebhooksRoutes(router: Router, container: Container): void {
  const deps = resolveWebhooksDeps(container);
  const apiKeySvc = container.resolve(API_KEY_SVC) as ApiKeyService;

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey: string) => {
      const reqId = newId("sys");
      const ctx = makeServiceContext(
        { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
        reqId,
        reqId,
        epochToIso(Date.now()),
      );
      const result = await apiKeySvc.validateApiKey(ctx, { rawKey });
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

  const rlRead = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 60, keyPrefix: "rl:webhooks:read" });
  const rlWrite = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 30, keyPrefix: "rl:webhooks:write" });
  const rlAction = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 20, keyPrefix: "rl:webhooks:action" });

  router.use(auth);

  router.get("/", rlRead, ...makeListWebhooksHandler(deps));
  router.post("/", rlWrite, requireScope("webhooks:write"), ...makeCreateWebhookHandler(deps));
  router.get("/:id", rlRead, ...makeGetWebhookHandler(deps));
  router.patch("/:id", rlWrite, requireScope("webhooks:write"), ...makeUpdateWebhookHandler(deps));
  router.delete("/:id", rlWrite, requireScope("webhooks:write"), ...makeDeleteWebhookHandler(deps));
  router.get("/:id/deliveries", rlRead, ...makeListDeliveriesHandler(deps));
  router.get("/:id/deliveries/:deliveryId", rlRead, ...makeGetDeliveryHandler(deps));
  router.post("/:id/deliveries/:deliveryId/retry", rlAction, requireScope("webhooks:write"), ...makeRetryDeliveryHandler(deps));
}
