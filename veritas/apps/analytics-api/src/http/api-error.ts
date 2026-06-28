// ApiError: structured HTTP error with status code, machine-readable code, and detail.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  static badRequest(message: string, detail?: Record<string, unknown>): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, detail);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(resource: string, id?: string): ApiError {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    return new ApiError(404, "NOT_FOUND", msg);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, detail?: Record<string, unknown>): ApiError {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, detail);
  }

  static tooManyRequests(message = "Rate limit exceeded"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message);
  }
}
