// Express error-handler middleware: maps AppError subtypes and ApiError to HTTP status codes.

import type { Request, Response, NextFunction } from "express";
import { isAppError, UnauthorizedError, ForbiddenError, ValidationError, NotFoundError, ConflictError, RateLimitedError, UnavailableError } from "@veritas/core";
import { isAuthError } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import { ApiError } from "../http/api-error.js";

function statusFor(err: unknown): number {
  if (err instanceof ApiError) return err.statusCode;
  if (isAppError(err)) {
    if (err instanceof UnauthorizedError) return 401;
    if (err instanceof ForbiddenError) return 403;
    if (err instanceof ValidationError) return 422;
    if (err instanceof NotFoundError) return 404;
    if (err instanceof ConflictError) return 409;
    if (err instanceof RateLimitedError) return 429;
    if (err instanceof UnavailableError) return 503;
  }
  if (isAuthError(err)) return 401;
  return 500;
}

/** Build a centralised error handler that logs 5xx errors. */
export function buildErrorHandler(logger: Logger) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const status = statusFor(err);

    if (status >= 500) {
      logger.error("Unhandled error", {
        err: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        method: req.method,
        url: req.originalUrl,
      });
    }

    if (err instanceof ApiError) {
      res.status(err.statusCode).json({ success: false, data: null, error: err.body });
      return;
    }

    const message =
      isAppError(err) || isAuthError(err)
        ? (err as { message: string }).message
        : status < 500
          ? (err as { message?: string }).message ?? "Request error"
          : "Internal server error";

    const code = isAppError(err)
      ? (err as { code?: string }).code ?? "INTERNAL_ERROR"
      : status < 500 ? "REQUEST_ERROR" : "INTERNAL_ERROR";

    res.status(status).json({ success: false, data: null, error: { code, message } });
  };
}

/** Compat shim — the legacy thin MVP imported this directly. */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const status = statusFor(err);
  const message =
    isAppError(err) || isAuthError(err)
      ? (err as { message: string }).message
      : "Internal server error";
  const code = isAppError(err)
    ? (err as { code?: string }).code ?? "INTERNAL_ERROR"
    : "INTERNAL_ERROR";
  res.status(status).json({ success: false, data: null, error: { code, message } });
}
