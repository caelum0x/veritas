// Leaky bucket limiter — smooths bursts by draining at a fixed rate.
import { ok, err, type Result } from "@veritas/core";
import type { Cache } from "@veritas/cache";
import type { RateLimiter, LimiterOptions } from "./limiter.js";
import type { LimitDecision } from "./result.js";
import { allowedDecision, deniedDecision } from "./result.js";
import { RateLimitError, StorageError } from "./errors.js";

interface LeakyState {
  readonly queue: number;      // Current fill level (requests in bucket)
  readonly lastLeakAt: number; // Unix ms of last leak calculation
}

export class LeakyBucketLimiter implements RateLimiter {
  /** Drain rate in requests per ms. */
  private readonly leakRatePerMs: number;

  constructor(
    private readonly cache: Cache<LeakyState>,
    private readonly opts: LimiterOptions,
  ) {
    this.leakRatePerMs = opts.max / opts.windowMs;
  }

  async check(key: string, now: number = Date.now()): Promise<Result<LimitDecision, RateLimitError>> {
    try {
      const raw = await this.cache.get(key);
      const prev: LeakyState = raw && "value" in raw && raw.value !== undefined
        ? (raw as { value: LeakyState }).value
        : { queue: 0, lastLeakAt: now };

      const elapsed = Math.max(0, now - prev.lastLeakAt);
      const drained = Math.min(prev.queue, elapsed * this.leakRatePerMs);
      const currentQueue = prev.queue - drained;

      if (currentQueue >= this.opts.max) {
        // How long until one slot drains
        const msUntilSlot = Math.ceil((currentQueue - this.opts.max + 1) / this.leakRatePerMs);
        const resetAt = now + msUntilSlot;
        return ok(deniedDecision(this.opts.max, resetAt, now));
      }

      const next: LeakyState = { queue: currentQueue + 1, lastLeakAt: now };
      await this.cache.set(key, next, this.opts.windowMs * 2);

      const remaining = Math.max(0, this.opts.max - Math.ceil(next.queue));
      const resetAt = now + Math.ceil(next.queue / this.leakRatePerMs);
      return ok(allowedDecision(this.opts.max, remaining, resetAt));
    } catch (cause) {
      return err(new StorageError(`Leaky bucket storage failure for key ${key}`, cause) as unknown as RateLimitError);
    }
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key);
  }
}
