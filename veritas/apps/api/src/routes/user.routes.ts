// User route definitions: list, create, get, update, set-status, and verify-email endpoints.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { USER_SVC, API_KEY_SVC } from "@veritas/container/tokens";
import type { AppConfig } from "@veritas/config";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type UserService } from "@veritas/services";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../middleware/rate-limit.js";
import { makeUserController } from "../controllers/user.controller.js";

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

export function userRouter(container: Container, _config: AppConfig): Router {
  const router = Router();

  const userService = container.resolve(USER_SVC) as UserService;
  const apiKeyService = container.resolve(API_KEY_SVC) as ApiKeyService;

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

  const rlRead = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: "rl:user:read",
  });

  const rlWrite = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 20,
    keyPrefix: "rl:user:write",
  });

  const ctrl = makeUserController(userService);

  router.use(auth);
  router.get("/", rlRead, ctrl.listUsers);
  router.post("/", rlWrite, ctrl.createUser);
  router.get("/:id", rlRead, ctrl.getUser);
  router.patch("/:id", rlWrite, ctrl.updateUser);
  router.post("/:id/status", rlWrite, ctrl.setUserStatus);
  router.post("/:id/verify-email", rlWrite, ctrl.verifyEmail);

  return router;
}
