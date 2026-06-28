// Builds the Express application with full middleware stack, routers, and error handler.
import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { makeLoggingMiddleware } from "./middleware/logging.js";
import { makeMetricsMiddleware } from "./middleware/metrics.js";
import { makeAuthMiddleware } from "./middleware/auth.js";
import { makeRateLimitMiddleware } from "./middleware/rate-limit.js";
import { makeIdempotencyMiddleware } from "./middleware/idempotency.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { buildRouter } from "./router.js";

export function buildApp(deps: Deps): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Pre-parse middleware
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(makeLoggingMiddleware(deps.logger));
  app.use(makeMetricsMiddleware(deps.metricsRegistry));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Auth + rate limiting + idempotency
  app.use(makeAuthMiddleware(deps.authenticator));
  app.use(makeRateLimitMiddleware(deps.config.rateLimit));
  app.use(makeIdempotencyMiddleware(deps.logger));

  // Domain routers mounted at the configured base path
  const router = buildRouter(deps);
  app.use(deps.config.server.basePath, router);

  // 404 and error handling
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
