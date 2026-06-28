// Structured HTTP access log middleware using @veritas/observability Logger.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { REQUEST_ID_HEADER } from "./request-id.js";

export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();
    const requestId = req.headers[REQUEST_ID_HEADER] as string | undefined;

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

      logger[level]("http.request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        requestId,
        contentLength: res.getHeader("content-length"),
        userAgent: req.headers["user-agent"],
      });
    });

    next();
  };
}
