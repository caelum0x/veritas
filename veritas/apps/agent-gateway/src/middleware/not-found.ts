// Express middleware that returns a 404 Problem Details response for unmatched routes.

import type { Request, Response } from "express";
import { PROBLEMS } from "../http/problem.js";

/** Catch-all not-found handler — must be mounted after all routes. */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json(PROBLEMS.notFound(`Route not found: ${req.method} ${req.path}`));
}
