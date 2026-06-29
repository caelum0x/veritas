// RateLimitError — typed errors emitted by rate-limiting subsystem.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class RateLimitError extends AppError {
  readonly retryAfterMs: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAtMs: number;

  constructor(
    message: string,
    opts: Partial<AppErrorOptions> & {
      retryAfterMs?: number;
      limit?: number;
      remaining?: number;
      resetAtMs?: number;
    } = {}
  ) {
    const { retryAfterMs = 0, limit = 0, remaining = 0, resetAtMs = 0, ...rest } = opts;
    super("RATE_LIMITED" as const, 429, message, rest);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.limit = limit;
    this.remaining = remaining;
    this.resetAtMs = resetAtMs;
  }
}

export class StorageError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as const, 500, message, { cause });
    this.name = "StorageError";
  }
}
