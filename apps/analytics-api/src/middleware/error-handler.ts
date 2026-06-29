// Error-handler middleware — maps domain errors and unknown exceptions to JSON responses.
import type { Request, Response, NextFunction } from "express";
import { isAppError, InternalError } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { ApiError } from "../http/api-error.js";

const APP_ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

type ErrorHandlerFn = (err: unknown, req: Request, res: Response, next: NextFunction) => void;

/** Creates an Express 4-argument error handler bound to the given logger. */
export function errorHandler(logger: Logger): ErrorHandlerFn {
  return function handleError(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) return;

    if (err instanceof ApiError) {
      logger.warn("api error", { code: err.code, status: err.status, message: err.message });
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, ...(err.detail ? { detail: err.detail } : {}) } });
      return;
    }

    const appErr = isAppError(err) ? err : new InternalError({ cause: err });
    const status = APP_ERROR_STATUS[appErr.code] ?? 500;

    if (status >= 500) {
      logger.error("unhandled error", { code: appErr.code, message: appErr.message, status });
    } else {
      logger.warn("request error", { code: appErr.code, message: appErr.message, status });
    }

    res.status(status).json({
      success: false,
      error: {
        code: appErr.code,
        message: appErr.message,
        ...(appErr.details ? { details: appErr.details } : {}),
      },
    });
  };
}
