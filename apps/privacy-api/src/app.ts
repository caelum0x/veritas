// Builds the Express application: applies the full middleware stack and mounts the router.

import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";

export function buildApp(deps: Deps): Express {
  const { config, logger, metricsRegistry } = deps;

  const app = express();

  // Security headers before anything else
  app.use(securityHeadersMiddleware);

  // Request identification and correlation
  app.use(requestIdMiddleware);

  // Structured request logging
  app.use(loggingMiddleware(logger));

  // Prometheus-style metrics
  app.use(metricsMiddleware(metricsRegistry));

  // Rate limiting
  app.use(rateLimitMiddleware(config.rateLimitWindowMs, config.rateLimitMaxRequests));

  // Body parsing
  app.use(express.json({ limit: config.bodyLimitBytes }));
  app.use(express.urlencoded({ extended: false, limit: config.bodyLimitBytes }));

  // Idempotency
  app.use(idempotencyMiddleware(config.idempotencyTtlMs));

  // Feature routes
  app.use("/", buildRouter(deps));

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}
