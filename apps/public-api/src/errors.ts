// errors.ts: application-level error utilities and AppError → HTTP mapping helpers.
import { AppError, isAppError } from "@veritas/core";
import type { ErrorCode } from "@veritas/core";

/** Map an AppError's code to an HTTP status code. */
export function appErrorToStatus(err: AppError): number {
  return err.status;
}

/** Map an AppError's code to the ErrorCode discriminant. */
export function appErrorToCode(err: AppError): ErrorCode {
  return err.code as ErrorCode;
}

/** Normalize any thrown value into an AppError for the error handler. */
export function normalizeError(thrown: unknown): AppError {
  if (isAppError(thrown)) return thrown;
  if (thrown instanceof Error) {
    return new AppError("INTERNAL", 500, thrown.message, { cause: thrown });
  }
  return new AppError("INTERNAL", 500, "An unexpected error occurred");
}

export { AppError, isAppError };
