// AppError: the base application error carrying a stable code and context.

/** Stable machine-readable error codes shared across the platform. */
export type ErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INTERNAL";

/** Optional structured detail bag attached to an error. */
export type ErrorDetails = Readonly<Record<string, unknown>>;

/** Options accepted by every AppError subclass constructor. */
export interface AppErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
  readonly details?: ErrorDetails;
}

/**
 * Base class for all domain errors. Carries a stable `code`, an HTTP `status`,
 * an optional `cause`, and structured `details` safe for logging.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetails;
  override readonly cause?: unknown;

  constructor(
    code: ErrorCode,
    status: number,
    defaultMessage: string,
    options: AppErrorOptions = {},
  ) {
    super(options.message ?? defaultMessage);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = options.details ?? {};
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Serialize to a plain object suitable for API responses (no stack). */
  toJSON(): {
    code: ErrorCode;
    status: number;
    message: string;
    details: ErrorDetails;
  } {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      details: this.details,
    };
  }
}

/** Type guard for AppError instances. */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
