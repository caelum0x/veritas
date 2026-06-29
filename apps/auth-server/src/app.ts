// Builds and configures the production Express application with the full middleware stack.

import express, { type Express } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { requestId } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { notFound } from "./middleware/not-found.js";
import { buildErrorHandler } from "./middleware/error-handler.js";
import { attachContext } from "./context.js";

export function buildApp(deps: Deps): Express {
  const { config, logger, metrics } = deps;

  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  // Core middleware
  app.use(securityHeaders);
  app.use(requestId);
  app.use(attachContext);
  app.use(loggingMiddleware(logger));
  app.use(metricsMiddleware(metrics));
  app.use(rateLimitMiddleware(config));
  app.use(idempotencyMiddleware(config.idempotencyTtlMs));

  // Body parsing
  app.use(express.json({ limit: config.bodyLimitBytes }));
  app.use(express.urlencoded({ extended: false }));

  // CORS
  const origins = config.corsOrigins === "*"
    ? ["*"]
    : config.corsOrigins.split(",").map((o) => o.trim());

  app.use((_req, res, next) => {
    const origin = origins.includes("*") ? "*" : origins[0] ?? "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Idempotency-Key,X-Request-ID");
    if (_req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Feature routes
  app.use(buildRouter(deps));

  // 404 and error handlers (must be last)
  app.use(notFound);
  app.use(buildErrorHandler(logger));

  return app;
}
