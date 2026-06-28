// v1 Agents routes: register, list, get, update, and delete CAP agents behind API-key auth.
import { Router } from "express";
import { epochToIso, newId } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type AgentService } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { createAuthMiddleware, requireScope } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import { makeAgentsController } from "./agents.controller.js";

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export interface AgentsRouterDeps {
  readonly agentService: AgentService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
}

export function agentsRouter(deps: AgentsRouterDeps): Router {
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

  const rl120 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:agent:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const rl30 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:agent:write:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const ctrl = makeAgentsController(deps.agentService);

  router.use(auth);
  router.get("/", rl120, ctrl.listAgents);
  router.post("/", rl30, requireScope("agents:write"), ctrl.registerAgent);
  router.get("/:id", rl120, ctrl.getAgent);
  router.patch("/:id", rl30, requireScope("agents:write"), ctrl.updateAgent);
  router.delete("/:id", rl30, requireScope("agents:write"), ctrl.deleteAgent);

  return router;
}
