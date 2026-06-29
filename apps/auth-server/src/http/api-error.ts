// ApiError: HTTP-layer error class carrying a status code and structured body.

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/** Throwable HTTP error that controllers and middleware can raise. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = { code, message, ...(details !== undefined ? { details } : {}) };
  }

  static badRequest(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
