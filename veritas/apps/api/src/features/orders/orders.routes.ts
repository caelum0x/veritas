// Orders feature router: mounts all order endpoints with auth and rate limiting.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { API_KEY_SVC } from "@veritas/container/tokens";
import type { ApiKeyService } from "@veritas/services";
import { makeServiceContext, epochToIso, newId } from "@veritas/services";
import { createAuthMiddleware, requireScope } from "../../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../../middleware/rate-limit.js";
import { resolveOrdersDeps } from "./orders.service.js";
import {
  makeCreateOrderHandler,
  makeListOrdersHandler,
  makeGetOrderHandler,
  makeMarkPaidHandler,
  makeMarkFulfilledHandler,
  makeCancelOrderHandler,
} from "./orders.controller.js";

const store = new InMemoryRateLimitStore();

/** Register all /orders routes on the given router. */
export function registerOrdersRoutes(router: Router, container: Container): void {
  const deps = resolveOrdersDeps(container);
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

  const rl60 = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 60, keyPrefix: "rl:orders:read" });
  const rl30 = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 30, keyPrefix: "rl:orders:write" });
  const rl20 = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 20, keyPrefix: "rl:orders:action" });

  router.use(auth);

  router.get("/", rl60, ...makeListOrdersHandler(deps));
  router.post("/", rl30, requireScope("orders:write"), ...makeCreateOrderHandler(deps));
  router.get("/:id", rl60, ...makeGetOrderHandler(deps));
  router.post("/:id/pay", rl20, requireScope("orders:write"), ...makeMarkPaidHandler(deps));
  router.post("/:id/fulfill", rl20, requireScope("orders:write"), ...makeMarkFulfilledHandler(deps));
  router.delete("/:id", rl20, requireScope("orders:write"), ...makeCancelOrderHandler(deps));
}
