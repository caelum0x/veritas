// HTTP-layer AppError subclasses for the domain-router service.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class HttpNotFoundError extends AppError {
  constructor(resource: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `${resource} not found`, opts);
  }
}

export class HttpUnauthorizedError extends AppError {
  constructor(message = "Unauthorized", opts?: Partial<AppErrorOptions>) {
    super("UNAUTHORIZED", 401, message, opts);
  }
}

export class HttpForbiddenError extends AppError {
  constructor(message = "Forbidden", opts?: Partial<AppErrorOptions>) {
    super("FORBIDDEN", 403, message, opts);
  }
}

export class HttpBadRequestError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("BAD_REQUEST", 400, message, opts);
  }
}

export class HttpConflictError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("CONFLICT", 409, message, opts);
  }
}

export class HttpTooManyRequestsError extends AppError {
  constructor(message = "Too many requests", opts?: Partial<AppErrorOptions>) {
    super("RATE_LIMITED", 429, message, opts);
  }
}

export class HttpUnprocessableError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("UNPROCESSABLE", 422, message, opts);
  }
}

export class HttpInternalError extends AppError {
  constructor(message = "Internal server error", opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts);
  }
}
