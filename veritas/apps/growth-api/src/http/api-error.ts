// ApiError: structured HTTP error with status code and machine-readable code.
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
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

  static notFound(resource: string, id?: string): ApiError {
    const msg = id !== undefined ? `${resource} '${id}' not found` : `${resource} not found`;
    return new ApiError(404, "NOT_FOUND", msg);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, issues?: unknown[]): ApiError {
    return new ApiError(422, "VALIDATION_ERROR", message, issues);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
