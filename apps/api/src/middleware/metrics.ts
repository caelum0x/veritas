// Middleware to record per-request HTTP metrics using @veritas/observability Logger.
import type { RequestHandler } from "express";
import type { Logger } from "@veritas/observability";

export interface MetricsMiddlewareOptions {
  logger: Logger;
}

export function metrics(options: MetricsMiddlewareOptions): RequestHandler {
  const { logger } = options;
  return (req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const level      = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("http.metrics", {
        method:     req.method,
        path:       req.path,
        statusCode: res.statusCode,
        durationMs,
        requestId:  req.requestId,
      });
    });
    next();
  };
}
