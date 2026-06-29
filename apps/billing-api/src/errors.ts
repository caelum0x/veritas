// Domain-specific error classes for billing-api.

export class BillingApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BillingApiError";
  }
}

export class NotFoundError extends BillingApiError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} '${id}' not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends BillingApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, details);
    this.name = "ConflictError";
  }
}

export class ValidationError extends BillingApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION", message, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends BillingApiError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends BillingApiError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitedError extends BillingApiError {
  constructor(message = "Too many requests") {
    super("RATE_LIMITED", message);
    this.name = "RateLimitedError";
  }
}

export function isBillingApiError(e: unknown): e is BillingApiError {
  return e instanceof BillingApiError;
}

export function httpStatusForCode(code: string): number {
  const map: Record<string, number> = {
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION: 422,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    RATE_LIMITED: 429,
    UNAVAILABLE: 503,
  };
  return map[code] ?? 500;
}
