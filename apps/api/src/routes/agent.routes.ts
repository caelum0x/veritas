// Agent route definitions: register, list, get, update, set trust, and delete agents.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { AGENT_SVC, API_KEY_SVC } from "@veritas/container/tokens";
import type { AppConfig } from "@veritas/config";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService } from "@veritas/services";
import { createAuthMiddleware, requireScope } from "../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../middleware/rate-limit.js";
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from "../controllers/agent.controller.js";

const store = new InMemoryRateLimitStore();

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export function agentRouter(container: Container, _config: AppConfig): Router {
  const router = Router();

  const apiKeyService = container.resolve(API_KEY_SVC) as ApiKeyService;

  /** Attach resolved services to req so controllers can access them. */
  router.use((req, _res, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).container = {
      agentService: container.resolve(AGENT_SVC),
    };
    next();
  });

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey: string) => {
      const ctx = buildSystemContext();
      const result = await apiKeyService.validateApiKey(ctx, { rawKey });
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

  const rl120 = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 120,
    keyPrefix: "rl:agent:read",
  });

  const rl30 = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: "rl:agent:write",
  });

  router.use(auth);
  router.get("/", rl120, listAgents);
  router.post("/", rl30, requireScope("agents:write"), createAgent);
  router.get("/:id", rl120, getAgent);
  router.patch("/:id", rl30, requireScope("agents:write"), updateAgent);
  router.delete("/:id", rl30, requireScope("agents:write"), deleteAgent);

  return router;
}
