// Assigns a unique request ID to every inbound request for tracing.
import type { Request, Response, NextFunction } from "express";
import { newRequestId } from "@veritas/observability";

export const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof existing === "string" && existing.length > 0
      ? existing
      : newRequestId();

  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
