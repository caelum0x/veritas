// Middleware: structured request/response logging via @veritas/observability Logger.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { getRequestId } from "../context.js";

export function makeLoggingMiddleware(logger: Logger) {
  return function loggingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = Date.now();
    const requestId = getRequestId(req);

    logger.info("Request received", {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("Request completed", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs,
      });
    });

    next();
  };
}
