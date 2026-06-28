// Central Express error handler: maps domain and HTTP errors to consistent JSON responses.
import type { Request, Response, NextFunction } from "express";
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  UnavailableError,
  apiFailure,
  type ErrorCode,
} from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { HttpApiError } from "../http/api-error.js";

function statusForDomainError(error: AppError): number {
  if (error instanceof NotFoundError)    return 404;
  if (error instanceof ConflictError)    return 409;
  if (error instanceof ValidationError)  return 422;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError)   return 403;
  if (error instanceof RateLimitedError) return 429;
  if (error instanceof UnavailableError) return 503;
  return 500;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(logger: Logger) {
  return function (err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof HttpApiError) {
      if (err.statusCode >= 500) {
        logger.error("http_api_error", { requestId: req.requestId, statusCode: err.statusCode, code: err.code });
      }
      res.status(err.statusCode).json(
        apiFailure({ code: err.code as ErrorCode, message: err.message, details: err.fields ? { fields: err.fields } : undefined }),
      );
      return;
    }

    if (err instanceof AppError) {
      const status = statusForDomainError(err);
      if (status >= 500) {
        logger.error("domain_error", { requestId: req.requestId, type: err.constructor.name, message: err.message });
      }
      const details =
        err instanceof ValidationError && err.issues.length > 0
          ? { issues: err.issues }
          : undefined;
      res.status(status).json(apiFailure({ code: err.code, message: err.message, details }));
      return;
    }

    logger.error("unhandled_error", {
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json(apiFailure({ code: "INTERNAL" as ErrorCode, message: "An unexpected error occurred" }));
  };
}
