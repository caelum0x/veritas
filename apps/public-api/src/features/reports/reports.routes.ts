// Registers reports feature routes on the supplied Express router with auth + rate-limit middleware.
import { Router } from "express";
import { ReportService, ApiKeyService, makeServiceContext } from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { epochToIso, newId } from "@veritas/core";
import { createAuthMiddleware } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import { ReportsFeatureService } from "./reports.service.js";
import { ReportsController } from "./reports.controller.js";

/** Subset of the app Deps consumed by the reports feature. */
export interface ReportsRouteDeps {
  readonly reportService: ReportService;
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

/**
 * Mount reports endpoints under the provided router.
 * Expects the router to already be mounted at /reports.
 */
export function registerReportsRoutes(
  router: Router,
  deps: ReportsRouteDeps,
): void {
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

  const rlRead = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) =>
      `rl:v1:report:read:${(req as { apiKeyId?: string }).apiKeyId ?? req.ip}`,
  });

  const rlWrite = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) =>
      `rl:v1:report:write:${(req as { apiKeyId?: string }).apiKeyId ?? req.ip}`,
  });

  const svc = new ReportsFeatureService({ reportService: deps.reportService });
  const ctrl = new ReportsController({ reportsService: svc });

  router.use(auth);
  router.get("/", rlRead, ctrl.list);
  router.get("/by-verification/:verificationId", rlRead, ctrl.getByVerificationId);
  router.get("/:id", rlRead, ctrl.getById);
  router.delete("/:id", rlWrite, ctrl.delete);
}
