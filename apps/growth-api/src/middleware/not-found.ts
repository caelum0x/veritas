// 404 catch-all middleware for unmatched routes.
import type { Request, Response } from "express";
import { buildProblem } from "../http/problem.js";

export function notFoundHandler(req: Request, res: Response): void {
  const problem = buildProblem(
    404,
    "NOT_FOUND",
    `Route ${req.method} ${req.path} not found`,
    req.path,
  );
  res.status(404).json(problem);
}
