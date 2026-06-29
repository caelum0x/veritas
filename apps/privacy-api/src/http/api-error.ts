// ApiError: HTTP-aware error class with status code and machine-readable code.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(message, 403, "FORBIDDEN");
  }

  static notFound(message: string): ApiError {
    return new ApiError(message, 404, "NOT_FOUND");
  }

  static conflict(message: string): ApiError {
    return new ApiError(message, 409, "CONFLICT");
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(message, 422, "UNPROCESSABLE_ENTITY", details);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(message, 429, "TOO_MANY_REQUESTS");
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(message, 500, "INTERNAL_ERROR");
  }
}
