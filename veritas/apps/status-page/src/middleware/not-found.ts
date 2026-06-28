// Returns a 404 JSON response for any unmatched routes.
import type { Request, Response, NextFunction } from "express";
import { sendError } from "../http/responder.js";

export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  sendError(
    res,
    404,
    "NOT_FOUND",
    `Route ${req.method} ${req.path} not found`,
  );
}
