// Builds and applies the shared Express middleware stack for composed servers.

import express, { type Express, type RequestHandler } from "express";
import type { Logger } from "@veritas/observability";
import { runWithContext, newCorrelationId, newRequestId } from "@veritas/observability";

/** Options controlling which built-in middleware layers are enabled. */
export interface MiddlewareStackOptions {
  /** Maximum request body size (bytes). Defaults to 1 MiB. */
  readonly bodyLimitBytes?: number;
  /** Whether to trust X-Forwarded-* headers. */
  readonly trustProxy?: boolean;
  /** Additional custom middleware to apply after built-ins. */
  readonly custom?: readonly RequestHandler[];
  readonly logger: Logger;
}

/**
 * Attaches the shared middleware stack to the provided Express app.
 * Order: json body-parser → correlation context → custom middleware.
 */
export function applyMiddlewareStack(
  app: Express,
  options: MiddlewareStackOptions,
): void {
  const { bodyLimitBytes = 1_048_576, trustProxy = false, custom = [], logger } = options;

  if (trustProxy) {
    app.set("trust proxy", true);
  }

  // JSON body parsing
  app.use(
    express.json({
      limit: bodyLimitBytes,
      strict: true,
    }),
  );

  // URL-encoded form body parsing
  app.use(express.urlencoded({ extended: false, limit: bodyLimitBytes }));

  // Correlation-context injection per request
  app.use((req, _res, next) => {
    const correlationId =
      (req.headers["x-correlation-id"] as string | undefined) ?? newCorrelationId();
    const requestId =
      (req.headers["x-request-id"] as string | undefined) ?? newRequestId();

    runWithContext({ correlationId, requestId }, () => {
      logger.info("Incoming request", {
        method: req.method,
        path: req.path,
        correlationId,
        requestId,
      });
      next();
    });
  });

  // Apply custom middleware in order
  for (const mw of custom) {
    app.use(mw);
  }
}
