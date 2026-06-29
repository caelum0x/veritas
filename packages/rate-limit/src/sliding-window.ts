// Sliding window log limiter — precise per-key request log within a rolling window.
import { ok, err, type Result } from "@veritas/core";
import type { Cache } from "@veritas/cache";
import type { RateLimiter, LimiterOptions } from "./limiter.js";
import type { LimitDecision } from "./result.js";
import { allowedDecision, deniedDecision } from "./result.js";
import { RateLimitError, StorageError } from "./errors.js";

export class SlidingWindowLimiter implements RateLimiter {
  constructor(
    private readonly cache: Cache<readonly number[]>,
    private readonly opts: LimiterOptions,
  ) {}

  async check(key: string, now: number = Date.now()): Promise<Result<LimitDecision, RateLimitError>> {
    try {
      const cutoff = now - this.opts.windowMs;
      const raw = await this.cache.get(key);
      const log: readonly number[] = raw && "value" in raw && raw.value !== undefined
        ? (raw as { value: readonly number[] }).value
        : [];

      // Prune expired timestamps and append current request candidate
      const active = log.filter((ts) => ts > cutoff);

      if (active.length >= this.opts.max) {
        // Earliest entry in window dictates when a slot opens
        const oldest = active[0] ?? now;
        const resetAt = oldest + this.opts.windowMs;
        return ok(deniedDecision(this.opts.max, resetAt, now));
      }

      const next = [...active, now] as const;
      await this.cache.set(key, next, this.opts.windowMs + 1000);

      const resetAt = now + this.opts.windowMs;
      return ok(allowedDecision(this.opts.max, this.opts.max - next.length, resetAt));
    } catch (cause) {
      return err(new StorageError(`Sliding window storage failure for key ${key}`, cause) as unknown as RateLimitError);
    }
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key);
  }
}
