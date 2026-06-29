// UnauthorizedError: authentication is missing or invalid.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class UnauthorizedError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("UNAUTHORIZED", 401, "Authentication required", options);
  }

  /** Convenience factory with an explanatory reason. */
  static of(reason: string): UnauthorizedError {
    return new UnauthorizedError({ message: reason, details: { reason } });
  }
}
