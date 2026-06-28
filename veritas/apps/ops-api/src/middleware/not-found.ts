// Middleware: returns a structured 404 for routes that matched no handler.
import type { Request, Response } from "express";
import { sendApiError } from "../http/api-error.js";

export function notFoundMiddleware(req: Request, res: Response): void {
  sendApiError(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`);
}
