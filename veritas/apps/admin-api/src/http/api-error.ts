// Typed HTTP error class carrying status code and structured error payload.
import type { AppError, ErrorCode } from "@veritas/core";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static fromAppError(err: AppError): HttpError {
    const status = appErrorToStatus(err.code);
    return new HttpError(status, err.code, err.message, (err as { details?: unknown }).details);
  }
}

function appErrorToStatus(code: ErrorCode): number {
  switch (code) {
    case "NOT_FOUND": return 404;
    case "CONFLICT": return 409;
    case "VALIDATION": return 422;
    case "UNAUTHORIZED": return 401;
    case "FORBIDDEN": return 403;
    case "RATE_LIMITED": return 429;
    case "UNAVAILABLE": return 503;
    default: return 500;
  }
}
