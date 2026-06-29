// Attaches a unique request ID to every incoming request and response.
import type { Request, Response, NextFunction } from "express";
import { newRequestId } from "@veritas/observability";
import { REQUEST_ID_HEADER } from "../context.js";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id =
    (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? newRequestId();
  (req as Request & { id: string }).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
