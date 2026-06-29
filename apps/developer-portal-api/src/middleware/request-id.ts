// Attaches a unique X-Request-ID to every request and response.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { newRequestId } from "@veritas/observability";

export function requestIdMiddleware(): RequestHandler {
  return function requestId(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" && existing.length > 0 ? existing : newRequestId();
    (req.headers as Record<string, unknown>)["x-request-id"] = id;
    res.setHeader("X-Request-ID", id);
    next();
  };
}
