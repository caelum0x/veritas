// 404 handler for routes that don't match any registered path.

import type { Request, Response } from "express";
import { respondError } from "../http/responder.js";

export function notFoundMiddleware(req: Request, res: Response): void {
  respondError(res, 404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`, req.path);
}
