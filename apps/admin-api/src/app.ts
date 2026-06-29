// Builds and configures the Express application with middleware stack and routes.
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { buildLoggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { buildAuthMiddleware } from "./middleware/auth.js";
import { buildRateLimitMiddleware } from "./middleware/rate-limit.js";
import { pagination } from "./middleware/pagination.js";
import { tenantMiddleware } from "@veritas/tenancy";

/** Inline minimal CORS handler to avoid adding the cors npm package. */
function applyCors(origins: readonly string[], credentials: boolean, maxAgeSecs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers["origin"] as string | undefined;
    const allow = origins.includes("*") || (origin !== undefined && origins.includes(origin));
    if (origin !== undefined && allow) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      if (credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Secret,X-Tenant-Id,Idempotency-Key");
        res.setHeader("Access-Control-Max-Age", String(maxAgeSecs));
        res.status(204).end();
        return;
      }
    }
    next();
  };
}

/** Build and return the configured Express application. */
export function buildApp(deps: Deps): Express {
  const { config, logger } = deps;
  const app = express();

  if (config.server.trustProxy) {
    app.set("trust proxy", 1);
  }

  // Core middleware stack
  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(applyCors(config.server.cors.origins, config.server.cors.credentials, config.server.cors.maxAgeSecs));
  app.use(express.json({ limit: config.server.bodyLimitBytes }));
  app.use(express.urlencoded({ extended: false, limit: config.server.bodyLimitBytes }));
  app.use(buildLoggingMiddleware(logger));
  app.use(metricsMiddleware);
  app.use(buildRateLimitMiddleware({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests,
  }));

  // Auth + tenant resolution for all API routes
  const authMiddleware = buildAuthMiddleware(config, logger);
  app.use("/api", authMiddleware);
  app.use("/api", tenantMiddleware(deps.tenantStore, { strategy: "header", required: false }));
  app.use("/api", idempotencyMiddleware);
  app.use("/api", pagination);

  // Feature routes
  app.use(buildRouter(deps));

  // 404 and error handlers
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
