// not-found middleware: returns a structured 404 response for unmatched routes.

import type { Request, Response } from "express";

/** Catch-all 404 handler mounted after all routes. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: "NOT_FOUND",
      message: `No handler registered for ${req.method} ${req.path}`,
    },
  });
}
