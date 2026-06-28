// HttpApiError class and mapping from domain AppError to HTTP status codes.
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  UnavailableError,
} from "@veritas/core";

export interface HttpErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export class HttpApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;

  constructor(statusCode: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name       = "HttpApiError";
    this.statusCode = statusCode;
    this.code       = code;
    this.fields     = fields;
  }

  toBody(): HttpErrorBody {
    const body: HttpErrorBody = { code: this.code, message: this.message };
    if (this.fields) body.fields = this.fields;
    return body;
  }
}

export function toHttpError(error: AppError): HttpApiError {
  if (error instanceof NotFoundError)     return new HttpApiError(404, "NOT_FOUND",            error.message);
  if (error instanceof ConflictError)     return new HttpApiError(409, "CONFLICT",              error.message);
  if (error instanceof ValidationError) {
    const fields: Record<string, string[]> | undefined = error.issues.length > 0
      ? Object.fromEntries(error.issues.map((i) => [i.path, [i.message]]))
      : undefined;
    return new HttpApiError(422, "VALIDATION_ERROR", error.message, fields);
  }
  if (error instanceof UnauthorizedError) return new HttpApiError(401, "UNAUTHORIZED",          error.message);
  if (error instanceof ForbiddenError)    return new HttpApiError(403, "FORBIDDEN",             error.message);
  if (error instanceof RateLimitedError)  return new HttpApiError(429, "RATE_LIMITED",          error.message);
  if (error instanceof UnavailableError)  return new HttpApiError(503, "SERVICE_UNAVAILABLE",   error.message);
  return new HttpApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}

export function isHttpApiError(value: unknown): value is HttpApiError {
  return value instanceof HttpApiError;
}
