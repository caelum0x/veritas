// Verification-jobs feature router: mounts submit/list/get/cancel endpoints under the given router.
import type { Router } from "express";
import { VerificationJobService } from "@veritas/services";
import type { Logger } from "@veritas/core";
import { createAuthMiddleware } from "../../middleware/auth.js";
import {
  InMemoryRateLimitStore,
  createRateLimitMiddleware,
} from "../../middleware/rate-limit.js";
import type { VerificationJobFeatureDeps } from "./verification-jobs.service.js";
import {
  makeSubmitJobHandlers,
  makeListJobsHandlers,
  makeGetJobHandlers,
  makeCancelJobHandlers,
} from "./verification-jobs.controller.js";

/** Minimal Deps slice required by this feature. */
export interface VerificationJobRouteDeps {
  readonly verificationJobService: VerificationJobService;
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
const submitRl = createRateLimitMiddleware(_store, { windowMs: 60_000, maxRequests: 30, keyPrefix: "rl:vj:submit" });
const readRl = createRateLimitMiddleware(_store, { windowMs: 60_000, maxRequests: 120, keyPrefix: "rl:vj:read" });

/** Mount verification-job CRUD routes on the provided Express Router. */
export function registerVerificationJobsRoutes(
  router: Router,
  deps: VerificationJobRouteDeps,
): void {
  const featureDeps: VerificationJobFeatureDeps = {
    verificationJobService: deps.verificationJobService,
    logger: deps.logger,
  };

  const auth = createAuthMiddleware(deps.apiKeyService);

  // POST /  — submit a new verification job
  router.post("/", auth, submitRl, ...makeSubmitJobHandlers(featureDeps));

  // GET /   — list jobs (optional status filter, cursor pagination)
  router.get("/", auth, readRl, ...makeListJobsHandlers(featureDeps));

  // GET /:jobId — fetch single job by ID
  router.get("/:jobId", auth, readRl, ...makeGetJobHandlers(featureDeps));

  // DELETE /:jobId — cancel a queued job
  router.delete("/:jobId", auth, ...makeCancelJobHandlers(featureDeps));
}
