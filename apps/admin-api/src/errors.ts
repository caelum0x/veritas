// Canonical error helpers for the admin-api: maps domain errors to HTTP status codes.
import { isAppError } from "@veritas/core";
import type { AppError, ErrorCode } from "@veritas/core";
import { HttpError } from "./http/api-error.js";

/** Map an AppError code to an HTTP status code. */
export function appErrorToHttpStatus(code: ErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "VALIDATION":
      return 422;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "RATE_LIMITED":
      return 429;
    case "UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}

/** Convert any thrown value into an HttpError for uniform response handling. */
export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (isAppError(err)) return HttpError.fromAppError(err as AppError);
  const message = err instanceof Error ? err.message : "Internal server error";
  return new HttpError(500, "INTERNAL", message);
}

/** Throw an HttpError if a Result carries an error value. */
export function unwrapResult<T>(result: { ok: true; value: T } | { ok: false; error: AppError }): T {
  if (result.ok) return result.value;
  throw HttpError.fromAppError(result.error);
}
