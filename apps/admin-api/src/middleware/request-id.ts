// Attaches a unique request ID to every incoming request and response.
import type { Request, Response, NextFunction } from "express";
import { newId } from "@veritas/core";

const REQUEST_ID_HEADER = "x-request-id";

/** Middleware that ensures every request carries a unique x-request-id header. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers[REQUEST_ID_HEADER] as string | undefined;
  const requestId = existing ?? newId("req");
  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
