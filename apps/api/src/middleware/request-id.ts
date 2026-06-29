// Attaches a unique request ID to every incoming request and response.
import type { Request, Response, NextFunction } from "express";
import { newId } from "@veritas/core";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const REQUEST_ID_HEADER = "X-Request-Id";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming  = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  const requestId = typeof incoming === "string" && incoming.length > 0 ? incoming : newId("req");
  req.requestId   = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
