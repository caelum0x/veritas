// api-error.ts: typed HTTP error class carrying status code and machine-readable error code.
import type { ErrorCode } from "@veritas/core";
import type { ApiErrorDto } from "@veritas/contracts";

/** Thrown by controllers; caught by the error-handler middleware. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toDto(): ApiErrorDto {
    return { code: this.code, message: this.message };
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

  static tooManyRequests(message = "Rate limit exceeded"): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static quotaExceeded(message = "Plan quota exceeded"): ApiError {
    return new ApiError(402, "QUOTA_EXCEEDED", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }

  static serviceUnavailable(message = "Service unavailable"): ApiError {
    return new ApiError(503, "SERVICE_UNAVAILABLE", message);
  }

  static fromAppError(err: unknown): ApiError {
    if (err && typeof err === "object" && "name" in err && "message" in err) {
      return ApiError.fromServiceError(err as { name: string; message: string });
    }
    return ApiError.internal(err instanceof Error ? err.message : "Unknown error");
  }

  static fromServiceError(err: { readonly name: string; readonly message: string }): ApiError {
    switch (err.name) {
      case "ResourceNotFoundError": return ApiError.notFound(err.message);
      case "DuplicateResourceError": return ApiError.conflict(err.message);
      case "ServiceValidationError":
      case "PreconditionFailedError": return ApiError.badRequest(err.message);
      case "NotAuthenticatedError": return ApiError.unauthorized(err.message);
      case "InsufficientPermissionsError": return ApiError.forbidden(err.message);
      case "QuotaExceededError": return ApiError.quotaExceeded(err.message);
      case "DependencyUnavailableError": return ApiError.serviceUnavailable(err.message);
      default: return ApiError.internal(err.message);
    }
  }
}

function toErrorCode(code: string): ErrorCode {
  switch (code) {
    case "NOT_FOUND": return "NOT_FOUND";
    case "CONFLICT": return "CONFLICT";
    case "BAD_REQUEST":
    case "VALIDATION": return "VALIDATION";
    case "UNAUTHORIZED": return "UNAUTHORIZED";
    case "FORBIDDEN": return "FORBIDDEN";
    case "RATE_LIMITED": return "RATE_LIMITED";
    case "QUOTA_EXCEEDED":
    case "SERVICE_UNAVAILABLE":
    case "UNAVAILABLE": return "UNAVAILABLE";
    default: return "INTERNAL";
  }
}

/** Convert an unknown error into HTTP metadata for controller use. */
export function toHttpError(err: unknown): {
  statusCode: number;
  code: ErrorCode;
  message: string;
  fields?: Record<string, unknown>;
} {
  const apiErr = ApiError.fromAppError(err);
  const fields =
    apiErr.details !== undefined &&
    apiErr.details !== null &&
    typeof apiErr.details === "object"
      ? (apiErr.details as Record<string, unknown>)
      : undefined;
  return { statusCode: apiErr.status, code: toErrorCode(apiErr.code), message: apiErr.message, fields };
}
