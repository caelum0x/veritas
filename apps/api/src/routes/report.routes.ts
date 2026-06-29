// Report route definitions: list, get by ID, get by verification ID, and delete.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { REPORT_SVC, API_KEY_SVC } from "@veritas/container";
import type { AppConfig } from "@veritas/config";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type ReportService } from "@veritas/services";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware, InMemoryRateLimitStore } from "../middleware/rate-limit.js";
import { makeReportController } from "../controllers/report.controller.js";

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

export function reportRouter(container: Container, _config: AppConfig): Router {
  const router = Router();

  const reportService = container.resolve(REPORT_SVC) as ReportService;
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

  const rl60 = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: "rl:report:read",
  });

  const rl20 = createRateLimitMiddleware(store, {
    windowMs: 60_000,
    maxRequests: 20,
    keyPrefix: "rl:report:write",
  });

  const ctrl = makeReportController(reportService);

  router.use(auth);
  router.get("/", rl60, ctrl.listReports);
  router.get("/by-verification/:verificationId", rl60, ctrl.getReportByVerificationId);
  router.get("/:id", rl60, ctrl.getReport);
  router.delete("/:id", rl20, ctrl.deleteReport);

  return router;
}
