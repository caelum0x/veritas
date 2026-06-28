// Structured request/response logging middleware using @veritas/observability.

import type { Request, Response, NextFunction } from "express";
import { runWithContext } from "@veritas/observability";
import type { Logger } from "@veritas/observability";

export function loggingMiddleware(logger: Logger) {
  return function log(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId: string = (req as Request & { requestId?: string }).requestId ?? "unknown";

    runWithContext({ requestId }, () => {
      res.on("finish", () => {
        const durationMs = Date.now() - start;
        logger.info("http request", {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
          requestId,
        });
      });
      next();
    });
  };
}
