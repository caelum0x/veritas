// Builds and configures the Express application with middleware stack and routes.
import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { makeAuthMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { paginationMiddleware } from "./middleware/pagination.js";
import { buildErrorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { livenessHandler, readinessHandler } from "./health.js";
import { openApiHandler } from "./openapi.js";

export function buildApp(deps: Deps): Express {
  const app = express();
  const { config, logger, metricsRegistry, authenticator } = deps;

  // Infrastructure middleware
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(loggingMiddleware(logger));
  app.use(metricsMiddleware(metricsRegistry));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // CORS
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", config.corsOrigins);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Request-Id,X-Idempotency-Key,X-Veritas-Signature,X-Veritas-Timestamp",
    );
    if (_req.method === "OPTIONS") { res.status(204).end(); return; }
    next();
  });

  // Unauthenticated utility endpoints
  app.get("/v1/openapi.json", openApiHandler);
  app.get("/v1/health/live", livenessHandler);
  app.get("/v1/health/ready", readinessHandler);

  // Auth + rate-limit + idempotency on all authenticated /v1 routes
  const authMiddleware = makeAuthMiddleware(authenticator);
  app.use("/v1", authMiddleware);
  app.use("/v1", rateLimitMiddleware(config.rateLimitWindowMs, config.rateLimitMax));
  app.use("/v1", idempotencyMiddleware(config.idempotencyTtlMs));
  app.use("/v1", paginationMiddleware);

  // Feature routes
  app.use("/v1", buildRouter(deps));

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(buildErrorHandler(logger));

  return app;
}
