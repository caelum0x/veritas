// Structured request/response logging middleware using @veritas/observability.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { runWithContext } from "@veritas/observability";
import type { Logger } from "@veritas/observability";

export function loggingMiddleware(logger: Logger): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const requestId =
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : "unknown";

    runWithContext({ requestId }, () => {
      logger.info("Request received", {
        method: req.method,
        path: req.path,
        requestId,
      });

      res.on("finish", () => {
        const durationMs = Date.now() - start;
        logger.info("Request completed", {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
          requestId,
        });
      });

      next();
    });
  };
}
