// Middleware: attaches a unique request id to every incoming request.
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import type { OpsRequest } from "../context.js";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id =
    (req.headers["x-request-id"] as string | undefined) ??
    (req.headers["x-correlation-id"] as string | undefined) ??
    randomUUID();
  (req as OpsRequest).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
