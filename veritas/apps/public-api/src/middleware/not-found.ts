// not-found.ts: catch-all 404 handler for unmatched routes.
import type { Request, Response } from "express";
import { apiFailure } from "@veritas/core";

/** Express middleware that responds with 404 for any unmatched route. */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json(
    apiFailure({
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    }),
  );
}
