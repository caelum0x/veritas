// ApiError class for HTTP layer — carries status code and machine-readable code.
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, details);
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

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }

  static tooManyRequests(message = "Rate limit exceeded"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL", message);
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}
