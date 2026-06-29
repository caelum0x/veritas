// Express middleware for structured HTTP request/response logging.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

/** Return structured request logging middleware bound to the provided logger. */
export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const { method, path, url } = req;
    const requestId = req.headers["x-request-id"] as string | undefined;
    const correlationId = req.headers["x-correlation-id"] as string | undefined;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const fields = {
        method,
        path,
        url,
        status: res.statusCode,
        durationMs,
        requestId,
        correlationId,
      };

      if (res.statusCode >= 500) {
        logger.error("http: response", fields);
      } else if (res.statusCode >= 400) {
        logger.warn("http: response", fields);
      } else {
        logger.info("http: response", fields);
      }
    });

    logger.debug("http: request", { method, path, requestId, correlationId });
    next();
  };
}
