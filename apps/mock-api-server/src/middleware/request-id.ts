// Attaches a unique X-Request-ID header to every request if not already present.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { newRequestId } from "@veritas/observability";

export function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const existing = req.headers["x-request-id"];
    const reqId =
      typeof existing === "string" && existing.length > 0
        ? existing
        : newRequestId();
    req.headers["x-request-id"] = reqId;
    res.setHeader("x-request-id", reqId);
    next();
  };
}
