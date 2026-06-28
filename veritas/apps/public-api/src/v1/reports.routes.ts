// v1 Reports routes: mount report read + delete endpoints behind API-key auth and rate-limits.
import { Router } from "express";
import { epochToIso, newId } from "@veritas/core";
import { makeServiceContext, type ApiKeyService, type ReportService } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { createAuthMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import { makeReportsController } from "./reports.controller.js";

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export interface ReportsRouterDeps {
  readonly reportService: ReportService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
}

export function reportsRouter(deps: ReportsRouterDeps): Router {
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

  const rl60 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:report:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const rl20 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:report:write:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const ctrl = makeReportsController(deps.reportService);

  router.use(auth);
  router.get("/", rl60, ctrl.listReports);
  router.get("/by-verification/:verificationId", rl60, ctrl.getReportByVerificationId);
  router.get("/:id", rl60, ctrl.getReport);
  router.delete("/:id", rl20, ctrl.deleteReport);

  return router;
}
