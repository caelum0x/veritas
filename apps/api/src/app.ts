// Build and configure the Express application with full middleware stack and feature routes.
import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metrics } from "./middleware/metrics.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { buildRouter } from "./router.js";

export function buildApp(deps: Deps): Express {
  const app = express();

  if (deps.config.server.trustProxy) {
    app.set("trust proxy", 1);
  }

  // Core middleware
  app.use(requestIdMiddleware);
  app.use(securityHeaders());
  app.use(express.json({ limit: deps.config.server.bodyLimitBytes }));
  app.use(express.urlencoded({ extended: false }));
  app.use(loggingMiddleware(deps.logger));
  app.use(metrics({ logger: deps.logger }));

  // Feature routes
  app.use("/", buildRouter(deps));

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler(deps.logger));

  return app;
}
