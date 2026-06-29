// RateLimiter interface — contract all rate-limiting algorithms must implement.
import type { Result } from "@veritas/core";
import type { LimitDecision } from "./result.js";
import type { RateLimitError } from "./errors.js";

export interface LimiterOptions {
  readonly windowMs: number;
  readonly max: number;
}

export interface RateLimiter {
  /** Check and consume a token for the given key. Returns decision or error. */
  check(key: string, now?: number): Promise<Result<LimitDecision, RateLimitError>>;
  /** Reset all state for a given key. */
  reset(key: string): Promise<void>;
}
