// Assembles the Express application with full middleware stack and routes.

import express, { type Express } from "express";
import { buildRouter } from "./router.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { makeErrorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { apiKeyAuthMiddleware } from "./middleware/auth.js";
import { handleLiveness, makeReadinessHandler } from "./health.js";
import { OPENAPI_SPEC } from "./openapi.js";
import type { Deps } from "./container.js";

export function buildApp(deps: Deps): Express {
  const { config, logger, metrics } = deps;

  const app = express();

  // Parse JSON bodies
  app.use(express.json({ limit: "1mb" }));

  // Core infrastructure middleware
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(loggingMiddleware(logger));
  app.use(metricsMiddleware(metrics));

  // Rate limiting
  app.use(
    rateLimitMiddleware({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
    }),
  );

  // Health probes (unauthenticated)
  app.get("/health", handleLiveness);
  app.get("/health/ready", makeReadinessHandler(deps));

  // OpenAPI spec
  app.get("/openapi.json", (_req, res) => {
    res.json(OPENAPI_SPEC);
  });

  // Authenticated v1 API
  const v1 = express.Router();

  v1.use(apiKeyAuthMiddleware(deps.authenticator, logger));
  v1.use(
    idempotencyMiddleware({
      ttlMs: config.idempotencyTtlMs,
      logger,
    }),
  );

  v1.use(buildRouter(deps));
  app.use("/v1", v1);

  // 404 and error handling
  app.use(notFoundMiddleware);
  app.use(makeErrorHandler(logger));

  return app;
}
