// Builds the Express application with full middleware stack and feature routes.
import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { registerHealthRoutes } from "./health.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";

export function createApp(deps: Deps): Express {
  const app = express();

  // Trust proxy headers when behind a load balancer.
  app.set("trust proxy", 1);

  // Core middleware stack.
  app.use(requestIdMiddleware());
  app.use(securityHeadersMiddleware(deps.config.corsOrigins));
  app.use(loggingMiddleware(deps.logger));
  app.use(metricsMiddleware(deps.metrics));
  app.use(rateLimitMiddleware(deps.config.rateLimit));
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(idempotencyMiddleware());

  // Health endpoints (before auth so they are always reachable).
  registerHealthRoutes(app, deps);

  // Feature routes.
  app.use("/", buildRouter(deps));

  // 404 and error handlers (must be last).
  app.use(notFoundMiddleware());
  app.use(errorHandlerMiddleware(deps.logger));

  return app;
}
