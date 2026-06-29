// Global Express error handler that maps known errors to JSON responses.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { isAppError } from "@veritas/core";
import { isApiError } from "../http/api-error.js";
import { isHttpError } from "../errors.js";
import { problemForStatus } from "../http/problem.js";

export function errorHandlerMiddleware(logger: Logger) {
  return function handleError(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    if (isApiError(err)) {
      logger.warn("API error", {
        code: err.code,
        status: err.statusCode,
        path: req.path,
        message: err.message,
      });
      const problem = problemForStatus(err.statusCode, err.message, req.path, {
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      });
      res.status(err.statusCode).json(problem);
      return;
    }

    if (isHttpError(err)) {
      logger.warn("HTTP error", {
        statusCode: err.statusCode,
        path: req.path,
        message: err.message,
      });
      const problem = problemForStatus(err.statusCode, err.message, req.path);
      res.status(err.statusCode).json(problem);
      return;
    }

    if (isAppError(err)) {
      const statusCode = err.code === "NOT_FOUND" ? 404 : err.code === "CONFLICT" ? 409 : 422;
      logger.warn("App error", { code: err.code, path: req.path, message: err.message });
      const problem = problemForStatus(statusCode, err.message, req.path);
      res.status(statusCode).json(problem);
      return;
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Unhandled error", {
      path: req.path,
      method: req.method,
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    });

    const problem = problemForStatus(500, "Internal server error", req.path);
    res.status(500).json(problem);
  };
}
