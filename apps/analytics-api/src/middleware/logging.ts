// Structured request/response logging middleware using @veritas/observability.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

/** Express middleware that logs every HTTP request with method, path, status, and duration. */
export function loggingMiddleware(logger: Logger) {
  return function logRequest(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("http request", {
        method,
        url: originalUrl,
        status: res.statusCode,
        durationMs,
        requestId: (req as Request & { requestId?: string }).requestId,
      });
    });

    next();
  };
}
