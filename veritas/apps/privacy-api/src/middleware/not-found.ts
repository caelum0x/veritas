// Middleware: returns a 404 JSON response for any unmatched route.

import type { Request, Response } from "express";
import { makeProblem } from "../http/problem.js";

export function notFoundHandler(req: Request, res: Response): void {
  const problem = makeProblem(
    404,
    "NOT_FOUND",
    `Route not found: ${req.method} ${req.path}`,
    req.path,
  );
  res.status(404).json(problem);
}
