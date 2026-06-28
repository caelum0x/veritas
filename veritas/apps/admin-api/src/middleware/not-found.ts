// 404 catch-all middleware for unmatched routes.
import type { Request, Response } from "express";
import { sendError } from "../http/responder.js";

/** Returns a 404 Not Found response for any unmatched route. */
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `No route found for ${req.method} ${req.path}`);
}
