// 404 fallback middleware for unmatched routes.

import type { Request, Response } from "express";
import { sendError } from "../http/responder.js";

export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`);
}
