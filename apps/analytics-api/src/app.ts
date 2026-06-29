// Build the Express application: attach middleware stack, mount versioned router, error handler.
import express, { type Express } from "express";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { makeAuthMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { makeHealthHandler } from "./health.js";
import { openApiHandler } from "./openapi.js";
import { buildRouter } from "./router.js";
import type { Deps } from "./container.js";

/** Assemble the Express application with all middleware and routes. */
export function buildApp(deps: Deps): Express {
  const app = express();

  app.set("trust proxy", deps.config.trustProxy ? 1 : 0);
  app.disable("x-powered-by");

  // Global middleware
  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(loggingMiddleware(deps.logger));
  app.use(metricsMiddleware(deps.metricsRegistry));
  app.use(express.json({ limit: deps.config.bodyLimitBytes }));

  // Unauthenticated routes
  app.get("/health", makeHealthHandler(deps.healthChecks));
  app.get("/openapi.json", openApiHandler);

  // Authenticated API routes with rate limiting
  app.use(
    rateLimitMiddleware({
      max: deps.config.rateLimitMax,
      windowMs: deps.config.rateLimitWindowMs,
    }),
  );
  app.use(makeAuthMiddleware(deps.authenticator));
  app.use("/v1", buildRouter(deps));

  // Catch-all and error handler
  app.use(notFoundMiddleware);
  app.use(errorHandler(deps.logger));

  return app;
}
