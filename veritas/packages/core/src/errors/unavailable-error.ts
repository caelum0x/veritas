// UnavailableError: a dependency or the service is temporarily unavailable.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class UnavailableError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("UNAVAILABLE", 503, "Service unavailable", options);
  }

  /** Convenience factory naming the failed dependency. */
  static of(dependency: string, reason?: string): UnavailableError {
    return new UnavailableError({
      message: reason
        ? `${dependency} unavailable: ${reason}`
        : `${dependency} unavailable`,
      details: { dependency, ...(reason ? { reason } : {}) },
    });
  }
}
