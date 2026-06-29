// Centralised Express error handler — maps domain errors to RFC-7807 responses.

import type { Request, Response, NextFunction } from "express";
import { AppError } from "@veritas/core";
import { isAuthError } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import { ApiError } from "../http/api-error.js";
import { sendError } from "../http/responder.js";

export function errorHandlerMiddleware(logger: Logger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ): void {
    if (err instanceof ApiError) {
      sendError(res, err.statusCode, err.code, err.message);
      return;
    }

    if (isAuthError(err)) {
      const status = err instanceof AppError ? err.status : 401;
      sendError(res, status, "UNAUTHORIZED", err.message);
      return;
    }

    if (err instanceof AppError) {
      const status = err.status ?? 500;
      if (status >= 500) {
        logger.error("Application error", { error: err.message, code: err.code });
      }
      sendError(res, status, err.code, err.message);
      return;
    }

    logger.error("Unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });
    sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
  };
}
