// NotFoundError: a requested resource does not exist.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class NotFoundError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, "Resource not found", options);
  }

  /** Convenience factory naming the missing resource and key. */
  static of(resource: string, key?: string): NotFoundError {
    return new NotFoundError({
      message: key ? `${resource} not found: ${key}` : `${resource} not found`,
      details: { resource, ...(key ? { key } : {}) },
    });
  }
}
