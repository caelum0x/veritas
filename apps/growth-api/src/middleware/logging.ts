// Structured HTTP request/response logging middleware.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { runWithContext, buildRequestContext } from "../context.js";

export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();
    const ctx = buildRequestContext(req);

    runWithContext(ctx, () => {
      const child = logger.child({ requestId: ctx.requestId });

      child.info("HTTP request received", {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      res.on("finish", () => {
        const duration = Date.now() - startMs;
        child.info("HTTP response sent", {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: duration,
        });
      });

      next();
    });
  };
}
