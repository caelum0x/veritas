// Builds the Express application with the full middleware stack and feature routes.

import express, { type Application } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";

export function buildApp(deps: Deps): Application {
  const { config, logger, metrics } = deps;
  const app = express();

  // Capture raw body before JSON parsing for signature verification
  app.use(
    express.raw({ type: "*/*", limit: "1mb" }),
    (req, _res, next) => {
      if (Buffer.isBuffer(req.body)) {
        (req as express.Request & { rawBody: string }).rawBody = req.body.toString("utf-8");
        try {
          req.body = JSON.parse((req as express.Request & { rawBody: string }).rawBody);
        } catch {
          req.body = {};
        }
      }
      next();
    },
  );

  // Core middleware stack
  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(loggingMiddleware(logger));
  app.use(metricsMiddleware(metrics));
  app.use(
    rateLimitMiddleware({
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests,
    }),
  );
  app.use(idempotencyMiddleware({ windowMs: config.idempotencyWindowMs }));

  // Feature router
  app.use(buildRouter(deps));

  // Error handling (must be last)
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(logger));

  return app;
}
