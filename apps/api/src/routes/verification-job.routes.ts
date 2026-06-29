// Verification-job route definitions: submit, list, get, and cancel endpoints.
import { Router } from "express";
import type { Container } from "@veritas/container";
import { VERIFICATION_JOB_SVC } from "@veritas/container/tokens";
import { LOGGER } from "@veritas/container/tokens";
import { API_KEY_SVC } from "@veritas/container/tokens";
import type { AppConfig } from "@veritas/config";
import { createAuthMiddleware } from "../middleware/auth.js";
import type { ApiKeyAuthService } from "../middleware/auth.js";
import type { Logger } from "@veritas/core";
import type { VerificationJobService } from "@veritas/services";
import {
  makeSubmitHandler,
  makeListHandler,
  makeGetByIdHandler,
  makeCancelHandler,
} from "../controllers/verification-job.controller.js";

/** Build and return the verification-jobs sub-router. */
export function verificationJobRouter(
  container: Container,
  _config: AppConfig
): Router {
  const router = Router();

  const jobService = container.resolve(VERIFICATION_JOB_SVC) as VerificationJobService;
  const logger = container.resolve(LOGGER) as Logger;

  // Wrap the container-registered ApiKeyService in the ApiKeyAuthService interface.
  const apiKeySvc = container.resolve(API_KEY_SVC);
  const authService: ApiKeyAuthService = {
    validateApiKey: (key: string) =>
      (apiKeySvc as unknown as ApiKeyAuthService).validateApiKey(key),
  };

  const auth = createAuthMiddleware(authService);

  // POST /verification-jobs — submit a new job (requires authentication)
  router.post(
    "/",
    auth,
    ...makeSubmitHandler(jobService, logger)
  );

  // GET /verification-jobs — list jobs with optional status filter (requires authentication)
  router.get(
    "/",
    auth,
    ...makeListHandler(jobService, logger)
  );

  // GET /verification-jobs/:jobId — fetch a single job by ID (requires authentication)
  router.get(
    "/:jobId",
    auth,
    ...makeGetByIdHandler(jobService, logger)
  );

  // DELETE /verification-jobs/:jobId — cancel a queued job (requires authentication)
  router.delete(
    "/:jobId",
    auth,
    ...makeCancelHandler(jobService, logger)
  );

  return router;
}
