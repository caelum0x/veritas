// Builds the Express application: applies middleware stack, mounts router and error handler.
import express, { type Express } from "express";
import cors from "cors";
import type { Deps } from "./container.js";
import { buildRouter } from "./router.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { metricsMiddleware, createHttpMetrics } from "./middleware/metrics.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";

export function buildApp(deps: Deps): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const httpMetrics = createHttpMetrics(deps.metrics);

  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(
    cors({
      origin: deps.config.corsOrigin,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
      exposedHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(loggingMiddleware(deps.logger));
  app.use(metricsMiddleware(httpMetrics));
  app.use(
    rateLimitMiddleware({
      windowMs: deps.config.rateLimit.windowMs,
      max: deps.config.rateLimit.max,
    }),
  );
  app.use(idempotencyMiddleware(deps.logger));

  const router = buildRouter(deps);
  app.use("/api/v1", router);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(deps.logger));

  return app;
}
