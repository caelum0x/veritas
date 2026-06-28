// Reports feature router: mounts list/get/get-by-verification/delete endpoints under the given router.
import type { Router } from "express";
import { ReportService } from "@veritas/services";
import type { Logger } from "@veritas/core";
import { createAuthMiddleware } from "../../middleware/auth.js";
import {
  InMemoryRateLimitStore,
  createRateLimitMiddleware,
} from "../../middleware/rate-limit.js";
import type { ReportFeatureDeps } from "./reports.service.js";
import {
  makeListReportsHandlers,
  makeGetReportHandlers,
  makeGetReportByVerificationHandlers,
  makeDeleteReportHandlers,
} from "./reports.controller.js";

/** Minimal Deps slice required by this feature's router. */
export interface ReportRouteDeps {
  readonly reportService: ReportService;
  readonly logger: Logger;
  readonly apiKeyService: {
    validateApiKey(key: string): Promise<{
      apiKeyId: string;
      orgId: string;
      userId?: string;
      scopes: string[];
      active: boolean;
    } | null>;
  };
}

const _store = new InMemoryRateLimitStore();
const readRl = createRateLimitMiddleware(_store, { windowMs: 60_000, maxRequests: 60, keyPrefix: "rl:reports:read" });
const writeRl = createRateLimitMiddleware(_store, { windowMs: 60_000, maxRequests: 20, keyPrefix: "rl:reports:write" });

/** Mount report CRUD routes on the provided Express Router. */
export function registerReportsRoutes(
  router: Router,
  deps: ReportRouteDeps,
): void {
  const featureDeps: ReportFeatureDeps = {
    reportService: deps.reportService,
    logger: deps.logger,
  };

  const auth = createAuthMiddleware(deps.apiKeyService);

  // GET /  — list reports, optional verificationId filter
  router.get("/", auth, readRl, ...makeListReportsHandlers(featureDeps));

  // GET /by-verification/:verificationId — report linked to a verification run
  router.get("/by-verification/:verificationId", auth, readRl, ...makeGetReportByVerificationHandlers(featureDeps));

  // GET /:reportId — fetch a single report by its ID
  router.get("/:reportId", auth, readRl, ...makeGetReportHandlers(featureDeps));

  // DELETE /:reportId — delete a report
  router.delete("/:reportId", auth, writeRl, ...makeDeleteReportHandlers(featureDeps));
}
