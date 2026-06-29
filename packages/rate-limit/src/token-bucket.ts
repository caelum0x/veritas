// Token bucket limiter — allows bursting up to capacity; refills at a steady rate.
import { ok, err, type Result } from "@veritas/core";
import type { Cache } from "@veritas/cache";
import type { RateLimiter, LimiterOptions } from "./limiter.js";
import type { LimitDecision } from "./result.js";
import { allowedDecision, deniedDecision } from "./result.js";
import { RateLimitError, StorageError } from "./errors.js";

interface BucketState {
  readonly tokens: number;
  readonly lastRefillAt: number;
}

export interface TokenBucketOptions extends LimiterOptions {
  /** Tokens added per ms (derived from max/windowMs if omitted). */
  readonly refillRatePerMs?: number;
}

export class TokenBucketLimiter implements RateLimiter {
  private readonly refillRatePerMs: number;

  constructor(
    private readonly cache: Cache<BucketState>,
    private readonly opts: TokenBucketOptions,
  ) {
    this.refillRatePerMs =
      opts.refillRatePerMs ?? opts.max / opts.windowMs;
  }

  async check(key: string, now: number = Date.now()): Promise<Result<LimitDecision, RateLimitError>> {
    try {
      const raw = await this.cache.get(key);
      const prev: BucketState = raw && "value" in raw && raw.value !== undefined
        ? (raw as { value: BucketState }).value
        : { tokens: this.opts.max, lastRefillAt: now };

      const elapsed = Math.max(0, now - prev.lastRefillAt);
      const refilled = Math.min(this.opts.max, prev.tokens + elapsed * this.refillRatePerMs);

      if (refilled < 1) {
        const resetAt = now + Math.ceil((1 - refilled) / this.refillRatePerMs);
        return ok(deniedDecision(this.opts.max, resetAt, now));
      }

      const next: BucketState = { tokens: refilled - 1, lastRefillAt: now };
      await this.cache.set(key, next, this.opts.windowMs * 2);

      const resetAt = now + Math.ceil((this.opts.max - next.tokens) / this.refillRatePerMs);
      return ok(allowedDecision(this.opts.max, Math.floor(next.tokens), resetAt));
    } catch (cause) {
      return err(new StorageError(`Token bucket storage failure for key ${key}`, cause) as unknown as RateLimitError);
    }
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key);
  }
}
