// ApiError: typed HTTP error with status code and optional detail payload.

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly detail: unknown;

  constructor(statusCode: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.detail = detail;
  }

  static badRequest(message: string, detail?: unknown): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, detail);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(resource: string): ApiError {
    return new ApiError(404, "NOT_FOUND", `${resource} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, detail?: unknown): ApiError {
    return new ApiError(422, "UNPROCESSABLE", message, detail);
  }

  static tooManyRequests(retryAfterSec?: number): ApiError {
    const msg = retryAfterSec
      ? `Rate limit exceeded. Retry after ${retryAfterSec}s.`
      : "Rate limit exceeded.";
    return new ApiError(429, "TOO_MANY_REQUESTS", msg);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message);
  }
}
