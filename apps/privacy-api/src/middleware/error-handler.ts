// Express error handler: maps AppError, ApiError, ZodError, and unknown errors to RFC 7807 JSON.

import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { isAppError } from "@veritas/core";
import { ZodError } from "zod";
import { ApiError } from "../http/api-error.js";
import { makeProblem } from "../http/problem.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    const problem = makeProblem(err.statusCode, err.code, err.message, req.path);
    res.status(err.statusCode).json(problem);
    return;
  }

  if (err instanceof ZodError) {
    const detail = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    const problem = makeProblem(400, "VALIDATION_ERROR", detail, req.path, {
      issues: err.errors,
    });
    res.status(400).json(problem);
    return;
  }

  if (isAppError(err)) {
    const appErr = err as { message: string; statusCode?: number; code?: string };
    const status = appErr.statusCode ?? 500;
    const code = appErr.code ?? "INTERNAL_ERROR";
    const problem = makeProblem(status, code, appErr.message, req.path);
    res.status(status).json(problem);
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const problem = makeProblem(500, "INTERNAL_ERROR", message, req.path);
  res.status(500).json(problem);
};
