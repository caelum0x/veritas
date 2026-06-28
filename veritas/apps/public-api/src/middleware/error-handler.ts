// error-handler.ts: central Express error-handling middleware mapping AppErrors to JSON responses.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { AppError, RateLimitedError, ValidationError, apiFailure } from "@veritas/core";

export interface ErrorHandlerOptions {
  readonly logger: Logger;
}

/** Alias for backwards-compatibility with code that imports errorHandler directly. */
export function errorHandler(
  logger: Logger,
): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
  return createErrorHandler({ logger });
}

/**
 * Creates an Express 4-argument error-handling middleware.
 * Maps AppErrors to structured JSON envelopes; wraps unknown errors as INTERNAL (500).
 */
export function createErrorHandler(
  opts: ErrorHandlerOptions,
): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
  const { logger } = opts;

  return function handleError(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    if (!(err instanceof AppError)) {
      logger.error("Unhandled error in request", {
        method: req.method,
        path: req.path,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json(
        apiFailure({ code: "INTERNAL", message: "An unexpected error occurred" }),
      );
      return;
    }

    const status = err.status;
    const code = err.code;

    if (status >= 500) {
      logger.error("Application error", {
        method: req.method,
        path: req.path,
        code,
        message: err.message,
        cause: err.cause instanceof Error ? err.cause.message : String(err.cause ?? ""),
      });
    } else {
      logger.warn("Client error", { method: req.method, path: req.path, code, message: err.message });
    }

    if (err instanceof RateLimitedError && err.retryAfterSeconds !== undefined) {
      res.setHeader("Retry-After", String(err.retryAfterSeconds));
    }

    const issues =
      err instanceof ValidationError && err.issues && err.issues.length > 0
        ? err.issues
        : undefined;

    res.status(status).json(
      apiFailure({
        code: code as import("@veritas/core").ErrorCode,
        message: err.message,
        ...(issues ? { details: { issues } } : {}),
      }),
    );
  };
}
