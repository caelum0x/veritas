// Not-found middleware — returns a 404 JSON response for unmatched routes.
import type { Request, Response } from "express";

/** Express catch-all that returns a 404 JSON response for unmatched routes. */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}
