// logging middleware: emits structured request/response log lines via @veritas/observability Logger.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

/** Returns an Express middleware that logs each request and its response status. */
export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const requestId = (req as Request & { id?: string }).id;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("http request", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    });

    next();
  };
}
