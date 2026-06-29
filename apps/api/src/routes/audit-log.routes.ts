// Audit-log route definitions: list, get, append, and summarize endpoints.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { AUDIT_LOG_SVC, API_KEY_SVC } from "@veritas/container/tokens";
import type { AppConfig } from "@veritas/config";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type AuditLogService } from "@veritas/services";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../middleware/rate-limit.js";
import { makeAuditLogController } from "../controllers/audit-log.controller.js";

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

export function auditLogRouter(container: Container, _config: AppConfig): Router {
  const router = Router();

  const auditLogService = container.resolve(AUDIT_LOG_SVC) as AuditLogService;
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
    keyPrefix: "rl:audit-log:read",
  });

  const rlWrite = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: "rl:audit-log:write",
  });

  const ctrl = makeAuditLogController(auditLogService);

  router.use(auth);
  router.get("/", rlRead, ctrl.listAuditLogs);
  router.get("/summarize", rlRead, ctrl.summarizeAuditLogs);
  router.get("/:id", rlRead, ctrl.getAuditLog);
  router.post("/", rlWrite, ctrl.appendAuditLog);

  return router;
}
