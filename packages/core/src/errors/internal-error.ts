// InternalError: an unexpected server-side failure.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class InternalError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Internal server error", options);
  }

  /** Wrap an arbitrary thrown value as an InternalError. */
  static wrap(cause: unknown, message?: string): InternalError {
    return new InternalError({
      message: message ?? "Internal server error",
      cause,
    });
  }
}
