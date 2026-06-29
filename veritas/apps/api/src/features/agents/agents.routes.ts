// Agents feature router: mounts all agent endpoints with auth, scopes, and rate limiting.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { API_KEY_SVC } from "@veritas/container/tokens";
import type { ApiKeyService } from "@veritas/services";
import { makeServiceContext } from "@veritas/services";
import { epochToIso, newId } from "@veritas/core";
import { createAuthMiddleware, requireScope } from "../../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../../middleware/rate-limit.js";
import { resolveAgentsDeps } from "./agents.service.js";
import {
  makeRegisterAgentHandler,
  makeListAgentsHandler,
  makeGetAgentHandler,
  makeUpdateAgentHandler,
  makeSetTrustHandler,
  makeDeleteAgentHandler,
} from "./agents.controller.js";

const store = new InMemoryRateLimitStore();

/** Register all /agents routes on the given router. */
export function registerAgentsRoutes(router: Router, container: Container): void {
  const deps = resolveAgentsDeps(container);
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

  const rl120 = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 120, keyPrefix: "rl:agents:read" });
  const rl30 = createRateLimitMiddleware(store, { windowMs: 60_000, maxRequests: 30, keyPrefix: "rl:agents:write" });

  router.use(auth);

  router.get("/", rl120, ...makeListAgentsHandler(deps));
  router.post("/", rl30, requireScope("agents:write"), ...makeRegisterAgentHandler(deps));
  router.get("/:id", rl120, ...makeGetAgentHandler(deps));
  router.patch("/:id", rl30, requireScope("agents:write"), ...makeUpdateAgentHandler(deps));
  router.put("/:id/trust", rl30, requireScope("agents:admin"), ...makeSetTrustHandler(deps));
  router.delete("/:id", rl30, requireScope("agents:write"), ...makeDeleteAgentHandler(deps));
}
