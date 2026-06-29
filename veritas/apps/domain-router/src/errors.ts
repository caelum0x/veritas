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
    super("VALIDATION", 400, message, opts);
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
    super("VALIDATION", 422, message, opts);
  }
}

export class HttpInternalError extends AppError {
  constructor(message = "Internal server error", opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts);
  }
}

// Domain-router routing error classes.

export class RoutingError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts);
  }
}

export class PlanBuildError extends AppError {
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Failed to build plan for claim "${claimId}": ${reason}`, opts);
  }
}

export class DispatchError extends AppError {
  constructor(verifierId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Dispatch failed for verifier "${verifierId}": ${reason}`, opts);
  }
}

export class MergeError extends AppError {
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Merge failed for claim "${claimId}": ${reason}`, opts);
  }
}

export class FallbackError extends AppError {
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Fallback failed for claim "${claimId}": ${reason}`, opts);
  }
}

export class WeightConfigError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts);
  }
}
