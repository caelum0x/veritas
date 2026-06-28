// BFF-specific error types for upstream communication and session failures

import { AppError, type AppErrorOptions } from "@veritas/core";

export class BffError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.name = "BffError";
  }
}

export class UpstreamApiError extends BffError {
  readonly statusCode: number;
  readonly upstreamBody: unknown;

  constructor(statusCode: number, upstreamBody: unknown, cause?: unknown) {
    const code =
      statusCode === 404
        ? ("NOT_FOUND" as const)
        : statusCode === 401
        ? ("UNAUTHORIZED" as const)
        : statusCode === 403
        ? ("FORBIDDEN" as const)
        : statusCode === 429
        ? ("RATE_LIMITED" as const)
        : statusCode >= 500
        ? ("UNAVAILABLE" as const)
        : ("INTERNAL" as const);

    const httpStatus =
      statusCode === 404
        ? 404
        : statusCode === 401
        ? 401
        : statusCode === 403
        ? 403
        : statusCode === 429
        ? 429
        : statusCode >= 500
        ? 503
        : 500;

    super(`Upstream API returned ${statusCode}`, {
      cause,
      details: { statusCode },
    });
    // Override code/status since BffError hardcodes INTERNAL/500
    (this as unknown as Record<string, unknown>)["code"] = code;
    (this as unknown as Record<string, unknown>)["status"] = httpStatus;
    this.name = "UpstreamApiError";
    this.statusCode = statusCode;
    this.upstreamBody = upstreamBody;
  }
}

export class BffSessionError extends BffError {
  constructor(detail?: string) {
    super(detail ?? "BFF session is invalid or missing", {
      cause: undefined,
    });
    (this as unknown as Record<string, unknown>)["code"] = "UNAUTHORIZED";
    (this as unknown as Record<string, unknown>)["status"] = 401;
    this.name = "BffSessionError";
  }
}

export class BffValidationError extends BffError {
  constructor(detail?: string) {
    super(detail ?? "Request validation failed");
    (this as unknown as Record<string, unknown>)["code"] = "VALIDATION";
    (this as unknown as Record<string, unknown>)["status"] = 422;
    this.name = "BffValidationError";
  }
}

export class BffUpstreamUnavailableError extends BffError {
  constructor(cause?: unknown) {
    super("Veritas API is currently unavailable", { cause });
    (this as unknown as Record<string, unknown>)["code"] = "UNAVAILABLE";
    (this as unknown as Record<string, unknown>)["status"] = 503;
    this.name = "BffUpstreamUnavailableError";
  }
}

export function isBffError(e: unknown): e is BffError {
  return e instanceof BffError;
}

export function isUpstreamApiError(e: unknown): e is UpstreamApiError {
  return e instanceof UpstreamApiError;
}
