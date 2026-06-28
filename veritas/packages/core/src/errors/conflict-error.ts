// ConflictError: the request conflicts with current resource state.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class ConflictError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("CONFLICT", 409, "Resource conflict", options);
  }

  /** Convenience factory describing the conflicting resource. */
  static of(resource: string, reason?: string): ConflictError {
    return new ConflictError({
      message: reason ? `${resource} conflict: ${reason}` : `${resource} conflict`,
      details: { resource, ...(reason ? { reason } : {}) },
    });
  }
}
