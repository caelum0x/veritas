// Structured HTTP request/response logging middleware using @veritas/observability.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

const REQUEST_ID_HEADER = "x-request-id";

export function loggingMiddleware(logger: Logger) {
  return function logRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const startMs = Date.now();
    const requestId = req.headers[REQUEST_ID_HEADER] as string | undefined;

    logger.info("Request started", {
      method: req.method,
      path: req.path,
      requestId,
    });

    res.once("finish", () => {
      const durationMs = Date.now() - startMs;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

      logger[level]("Request completed", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        requestId,
      });
    });

    next();
  };
}
