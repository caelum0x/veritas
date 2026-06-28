// Attaches a unique request ID to every incoming request for tracing.

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof existing === "string" && existing.length > 0 ? existing : randomUUID();
  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
