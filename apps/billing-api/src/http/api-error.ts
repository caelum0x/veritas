// ApiError: typed HTTP error class carrying status code and RFC 7807 fields.

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static notFound(resource: string, id?: string): ApiError {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    return new ApiError(404, "NOT_FOUND", msg);
  }

  static conflict(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static unprocessable(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(422, "VALIDATION", message, details);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL", message);
  }

  static fromCode(code: string, message: string): ApiError {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      VALIDATION: 422,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      RATE_LIMITED: 429,
      UNAVAILABLE: 503,
    };
    return new ApiError(statusMap[code] ?? 500, code, message);
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
