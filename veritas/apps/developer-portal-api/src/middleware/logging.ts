// Structured request/response logging middleware using @veritas/observability logger.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Logger } from "@veritas/observability";

export function loggingMiddleware(logger: Logger): RequestHandler {
  return function logRequest(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId = req.headers["x-request-id"] as string | undefined;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("HTTP request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        requestId,
        contentLength: res.getHeader("content-length"),
        userAgent: req.headers["user-agent"],
      });
    });

    next();
  };
}
