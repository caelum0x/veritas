// Request-ID middleware — attaches a unique X-Request-ID to every request and response.
import type { Request, Response, NextFunction } from "express";
import { newRequestId } from "@veritas/observability";

declare module "express" {
  interface Request {
    requestId?: string;
  }
}

/** Attaches a unique request ID to req.requestId and the X-Request-ID response header. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string | undefined) ?? newRequestId();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
}
