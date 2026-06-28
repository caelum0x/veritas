// Structured access-log middleware: logs method, path, status, and duration.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/core";

/** Build an access-log middleware scoped to the given logger. */
export function buildLoggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const method = req.method;
    const path = req.path;
    const requestId = req.headers["x-request-id"] as string | undefined;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      logger[level]("request", { method, path, status, durationMs, requestId });
    });

    next();
  };
}
