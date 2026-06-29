// Typed API error class for structured HTTP error responses.
export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toBody(): ApiErrorBody {
    return Object.freeze({
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    });
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

  static notFound(resource: string, id?: string): ApiError {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    return new ApiError(404, "NOT_FOUND", msg);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unprocessable(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
  }

  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, "TOO_MANY_REQUESTS", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
