// Middleware: generates a unique request ID and attaches it to request and response headers.

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers["x-request-id"];
  const id = (typeof existing === "string" && existing.length > 0) ? existing : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
