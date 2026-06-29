// Token-bucket rate guard: limits concurrent or per-window call volume.

import { RateLimitedError } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export interface RateGuardOptions {
  /** Max calls allowed per window. */
  readonly limit: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
  /** Human-readable name for error context. */
  readonly name?: string;
}

interface WindowState {
  readonly count: number;
  readonly windowStart: number;
}

/** Sliding fixed-window rate limiter. One instance per resource. */
export class RateGuard {
  private state: WindowState;
  private readonly opts: Required<RateGuardOptions>;

  constructor(opts: RateGuardOptions) {
    this.opts = { name: "rate-guard", ...opts };
    this.state = { count: 0, windowStart: Date.now() };
  }

  /** Attempt to acquire a token. Returns ok(true) or err(RateLimitedError). */
  acquire(): Result<true, RateLimitedError> {
    const now = Date.now();
    const { limit, windowMs, name } = this.opts;
    const elapsed = now - this.state.windowStart;

    if (elapsed >= windowMs) {
      this.state = { count: 1, windowStart: now };
      return ok(true);
    }

    if (this.state.count >= limit) {
      const retryAfterMs = windowMs - elapsed;
      return err(
        new RateLimitedError({
          message: `${name}: rate limit exceeded`,
          details: { retryAfterMs },
        })
      );
    }

    this.state = { ...this.state, count: this.state.count + 1 };
    return ok(true);
  }

  /** Execute fn only if a token can be acquired. */
  async guard<T>(fn: () => Promise<T>): Promise<Result<T, RateLimitedError | unknown>> {
    const token = this.acquire();
    if (token.ok === false) return token as Result<T, RateLimitedError>;
    try {
      return ok(await fn());
    } catch (e) {
      return err(e);
    }
  }
}
