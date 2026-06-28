// app.ts: builds and configures the Express application with the full production middleware stack.
import express, { type Express } from "express";
import type { AppConfig } from "@veritas/config";
import type { Logger } from "@veritas/observability";
import { buildRouter } from "./router.js";
import type { RouterDeps } from "./router.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { createLoggingMiddleware } from "./middleware/logging.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { createIdempotencyMiddleware } from "./middleware/idempotency.js";

/** Build and configure the Express application. */
export function buildApp(config: AppConfig, logger: Logger, deps: RouterDeps): Express {
  const app = express();

  // Trust reverse-proxy headers when configured
  if (config.server.trustProxy) {
    app.set("trust proxy", 1);
  }

  // Baseline security headers
  app.use(securityHeadersMiddleware);

  // Assign request IDs early so all logs include them
  app.use(requestIdMiddleware);

  // Structured access logging
  app.use(createLoggingMiddleware(logger));

  // Prometheus-style metrics
  app.use(metricsMiddleware);

  // Body parsers
  const bodyLimit = `${config.server.bodyLimitBytes ?? 1_048_576}b`;
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: bodyLimit }));

  // Idempotency deduplication for mutating requests
  app.use(createIdempotencyMiddleware());

  // Mount all versioned feature routes
  app.use("/", buildRouter(deps, config, logger));

  // 404 handler for unmatched routes
  app.use(notFoundMiddleware);

  // Central error handler (must be last)
  app.use(createErrorHandler({ logger }));

  return app;
}
