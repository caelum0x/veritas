// BFF error middleware: maps thrown errors to structured JSON responses

import type { Context, Next } from "hono";
import { isAppError, type ErrorCode } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { isBffError, isUpstreamApiError } from "../errors.js";

const HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

function codeToStatus(code: ErrorCode): number {
  return HTTP_STATUS[code] ?? 500;
}

export interface ErrorMiddlewareDeps {
  readonly logger: Logger;
}

/** Global Hono error handler for the BFF app. */
export function createErrorHandler(deps: ErrorMiddlewareDeps) {
  return (err: unknown, c: Context): Response => {
    if (isUpstreamApiError(err)) {
      deps.logger.warn("BFF upstream API error", {
        statusCode: err.statusCode,
        message: err.message,
      });
      return c.json(
        { success: false, error: { message: err.message, code: err.code } },
        err.statusCode as never
      );
    }

    if (isAppError(err)) {
      const status = codeToStatus(err.code);
      if (status >= 500) {
        deps.logger.error("BFF application error", { error: err.message, code: err.code });
      } else {
        deps.logger.warn("BFF client error", { error: err.message, code: err.code });
      }
      return c.json(
        { success: false, error: { message: err.message, code: err.code } },
        status as never
      );
    }

    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    deps.logger.error("BFF unhandled error", { error: message });
    return c.json(
      { success: false, error: { message: "Internal server error", code: "INTERNAL" as ErrorCode } },
      500
    );
  };
}

/** Middleware wrapper for async route errors (optional explicit catch). */
export function errorBoundary(deps: ErrorMiddlewareDeps) {
  return async (c: Context, next: Next): Promise<void | Response> => {
    try {
      await next();
    } catch (err: unknown) {
      return createErrorHandler(deps)(err, c);
    }
  };
}
