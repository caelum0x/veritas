// Attaches a unique request ID to every incoming request and response header.

import type { Request, Response, NextFunction } from "express";
import { newRequestId } from "@veritas/observability";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id =
    (typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"]
      : undefined) ?? newRequestId();

  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
