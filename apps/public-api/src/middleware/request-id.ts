// request-id.ts: assigns a unique X-Request-Id to every incoming request.
import type { Request, Response, NextFunction } from "express";

/** Attach a unique request ID to the request and response headers. */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.headers["x-request-id"];
  const requestId = typeof existing === "string" && existing.length > 0
    ? existing
    : crypto.randomUUID();

  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
