// Catch-all 404 middleware for paths not matched by any registered route.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { sendNotFound } from "../http/responder.js";

export function notFoundMiddleware(): RequestHandler {
  return (req: Request, res: Response, _next: NextFunction): void => {
    sendNotFound(res, `Route not found: ${req.method} ${req.path}`);
  };
}
