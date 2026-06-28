// RateLimitedError: the caller exceeded an allowed request rate.

import { AppError, type AppErrorOptions } from "./base-error.js";

export class RateLimitedError extends AppError {
  /** Seconds the client should wait before retrying, if known. */
  readonly retryAfterSeconds?: number;

  constructor(
    options: AppErrorOptions & { retryAfterSeconds?: number } = {},
  ) {
    super("RATE_LIMITED", 429, "Rate limit exceeded", options);
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  /** Convenience factory carrying a retry-after hint. */
  static of(retryAfterSeconds: number): RateLimitedError {
    return new RateLimitedError({
      message: `Rate limit exceeded; retry after ${retryAfterSeconds}s`,
      retryAfterSeconds,
      details: { retryAfterSeconds },
    });
  }
}
