// Global Express error handler: maps known error types to structured HTTP responses.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { isAppError } from "@veritas/core";
import { ApiError } from "../http/api-error.js";
import { buildProblem } from "../http/problem.js";
import { isAuthError } from "@veritas/auth";

export function buildErrorHandler(logger: Logger) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ApiError) {
      const problem = buildProblem(
        err.statusCode,
        err.code,
        err.message,
        req.path,
        err.detail !== undefined ? { detail: err.detail } : undefined,
      );
      res.status(err.statusCode).json(problem);
      return;
    }

    if (isAuthError(err)) {
      const problem = buildProblem(401, "UNAUTHORIZED", err.message, req.path);
      res.status(401).json(problem);
      return;
    }

    if (isAppError(err)) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION: 422,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        RATE_LIMITED: 429,
        UNAVAILABLE: 503,
        INTERNAL: 500,
      };
      const status = statusMap[err.code] ?? 500;
      const problem = buildProblem(status, err.code, err.message, req.path);
      res.status(status).json(problem);
      return;
    }

    logger.error("Unhandled error", {
      method: req.method,
      path: req.path,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    const problem = buildProblem(500, "INTERNAL_ERROR", "An unexpected error occurred", req.path);
    res.status(500).json(problem);
  };
}
