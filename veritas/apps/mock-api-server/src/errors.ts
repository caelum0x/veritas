// App-level error types that wrap domain errors for HTTP response serialisation.
import { AppError, isAppError } from "@veritas/core";

export { AppError, isAppError };

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (isAppError(err)) {
    return new HttpError(
      err.statusCode,
      err.code,
      err.message,
      (err as AppError & { details?: unknown }).details,
    );
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return new HttpError(500, "INTERNAL_ERROR", message);
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
