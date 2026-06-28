// Fixed window counter limiter — simple counter reset at fixed time boundaries.
import { ok, err, type Result } from "@veritas/core";
import type { Cache } from "@veritas/cache";
import type { RateLimiter, LimiterOptions } from "./limiter.js";
import type { LimitDecision } from "./result.js";
import { allowedDecision, deniedDecision } from "./result.js";
import { RateLimitError, StorageError } from "./errors.js";

interface WindowState {
  readonly count: number;
  readonly windowStart: number;
}

export class FixedWindowLimiter implements RateLimiter {
  constructor(
    private readonly cache: Cache<WindowState>,
    private readonly opts: LimiterOptions,
  ) {}

  async check(key: string, now: number = Date.now()): Promise<Result<LimitDecision, RateLimitError>> {
    try {
      const windowStart = Math.floor(now / this.opts.windowMs) * this.opts.windowMs;
      const resetAt = windowStart + this.opts.windowMs;

      const raw = await this.cache.get(key);
      const prev: WindowState | undefined = raw && "value" in raw && raw.value !== undefined
        ? (raw as { value: WindowState }).value
        : undefined;

      // If window has rolled over or no prior state, start fresh
      const current: WindowState =
        prev && prev.windowStart === windowStart
          ? prev
          : { count: 0, windowStart };

      if (current.count >= this.opts.max) {
        return ok(deniedDecision(this.opts.max, resetAt, now));
      }

      const next: WindowState = { count: current.count + 1, windowStart };
      await this.cache.set(key, next, this.opts.windowMs + 1000);

      return ok(allowedDecision(this.opts.max, this.opts.max - next.count, resetAt));
    } catch (cause) {
      return err(new StorageError(`Fixed window storage failure for key ${key}`, cause) as unknown as RateLimitError);
    }
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key);
  }
}
