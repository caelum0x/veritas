// Build and configure the Express application with the full middleware stack and router.

import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { buildRouter } from "./router.js";

/** Build and return a fully-configured Express application. */
export function buildApp(deps: Deps): Express {
  const app = express();

  // Disable framework fingerprinting
  app.disable("x-powered-by");

  // Parse JSON bodies
  app.use(express.json({ limit: deps.config.bodyLimitBytes }));

  // Security headers on every response
  app.use(securityHeadersMiddleware);

  // Assign correlation/request IDs
  app.use(requestIdMiddleware);

  // Structured request/response logging
  app.use(loggingMiddleware(deps.logger));

  // HTTP metrics collection
  app.use(metricsMiddleware(deps.metricsRegistry));

  // Rate limiting
  app.use(rateLimitMiddleware(deps.config));

  // Idempotency key deduplication
  app.use(idempotencyMiddleware(deps.config));

  // Feature routes
  app.use("/", buildRouter(deps));

  // 404 handler — must come after all routes
  app.use(notFoundMiddleware);

  // Global error handler — must be last and have 4 args
  app.use(errorHandlerMiddleware(deps.logger));

  return app;
}
