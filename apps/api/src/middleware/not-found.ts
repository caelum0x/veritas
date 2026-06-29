// Catch-all 404 middleware for unmatched routes.
import type { Request, Response, NextFunction } from "express";
import { apiFailure } from "@veritas/core";

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json(
    apiFailure({ code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` }),
  );
}
