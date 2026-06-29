// Middleware: structured request/response logging via @veritas/observability Logger.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("HTTP request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    });

    next();
  };
}
