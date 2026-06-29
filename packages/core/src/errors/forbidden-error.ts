// ForbiddenError: the caller is authenticated but lacks permission.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class ForbiddenError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("FORBIDDEN", 403, "Access forbidden", options);
  }

  /** Convenience factory naming the action that was denied. */
  static of(action: string): ForbiddenError {
    return new ForbiddenError({
      message: `Forbidden: ${action}`,
      details: { action },
    });
  }
}
