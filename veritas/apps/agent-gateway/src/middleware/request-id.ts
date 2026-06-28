// Express middleware that assigns a unique request ID to every inbound request.

import type { Request, Response, NextFunction } from "express";
import { newRequestId, newCorrelationId } from "@veritas/observability";

/** Assign x-request-id and x-correlation-id headers if not already present. */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? newRequestId();
  const correlationId =
    (req.headers["x-correlation-id"] as string | undefined) ?? newCorrelationId();

  req.headers["x-request-id"] = requestId;
  req.headers["x-correlation-id"] = correlationId;

  res.setHeader("x-request-id", requestId);
  res.setHeader("x-correlation-id", correlationId);

  next();
}
