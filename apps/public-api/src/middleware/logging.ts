// logging.ts: structured HTTP access log middleware using @veritas/observability logger.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

/** Returns an Express middleware that emits a structured log on every response. */
export function createLoggingMiddleware(logger: Logger) {
  return function loggingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const startMs = Date.now();
    const requestId = req.headers["x-request-id"] as string | undefined;

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const level =
        res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

      logger[level]("http", {
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
