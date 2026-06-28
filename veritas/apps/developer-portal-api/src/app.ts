// Build Express app — applies middleware stack, mounts router, attaches error handler.
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { createHealthHandler, createLivenessHandler } from "./health.js";
import { openapiHandler } from "./openapi.js";

export interface AppDeps {
  readonly portalService: import("@veritas/developer-portal").PortalService;
  readonly logger: import("@veritas/observability").Logger;
}

export function buildApp(deps: Deps): Express {
  const app = express();

  app.disable("x-powered-by");

  // Security headers
  app.use(securityHeadersMiddleware());

  // CORS
  const allowedOrigin = deps.config.corsOrigins;
  app.use(function corsMiddleware(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key,X-Request-ID,Idempotency-Key");
    res.setHeader("Access-Control-Expose-Headers", "X-Request-ID,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (_req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Request ID must be first
  app.use(requestIdMiddleware());

  // Structured logging
  app.use(loggingMiddleware(deps.logger));

  // Metrics
  app.use(metricsMiddleware(deps.metrics));

  // Rate limiting
  app.use(rateLimitMiddleware(deps.config));

  // Body parsing
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false }));

  // Idempotency
  app.use(idempotencyMiddleware(deps.config));

  // Health/liveness probes (no auth required)
  app.get("/health", createHealthHandler(deps));
  app.get("/livez", createLivenessHandler());
  app.get("/openapi.json", openapiHandler);

  // Versioned API router
  const v1Router = buildRouter(deps);
  app.use("/v1", v1Router);

  // 404 catch-all
  app.use(notFoundMiddleware());

  // Error handler (must be last)
  app.use(errorHandler(deps.logger));

  return app;
}
