// Token-bucket rate limiter for controlling LLM API call throughput
import { LLMLocalRateLimitError } from "./errors.js";

/** Configuration for a single token-bucket limiter */
export interface RateLimiterConfig {
  /** Maximum tokens the bucket can hold */
  readonly capacity: number;
  /** Tokens added per second (refill rate) */
  readonly refillPerSecond: number;
  /** Initial token count; defaults to capacity */
  readonly initialTokens?: number;
}

/** Result of a consume attempt */
export type ConsumeResult =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterMs: number };

/**
 * Token-bucket rate limiter.
 * Thread-safe for single-threaded Node.js event loop — no shared mutable state
 * escapes the instance.
 */
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefillAt: number;

  private readonly capacity: number;
  private readonly refillPerMs: number;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillPerMs = config.refillPerSecond / 1000;
    this.tokens = config.initialTokens ?? config.capacity;
    this.lastRefillAt = Date.now();
  }

  /** Refill tokens based on elapsed time since last refill */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillAt;
    const added = elapsed * this.refillPerMs;
    this.tokens = Math.min(this.capacity, this.tokens + added);
    this.lastRefillAt = now;
  }

  /**
   * Try to consume `cost` tokens from the bucket.
   * Returns `{ allowed: true }` on success or `{ allowed: false, retryAfterMs }` on failure.
   */
  tryConsume(cost = 1): ConsumeResult {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }

    const tokensNeeded = cost - this.tokens;
    const retryAfterMs = Math.ceil(tokensNeeded / this.refillPerMs);
    return { allowed: false, retryAfterMs };
  }

  /**
   * Consume `cost` tokens or throw LLMLocalRateLimitError.
   */
  consumeOrThrow(cost = 1): void {
    const result = this.tryConsume(cost);
    if (!result.allowed) {
      throw new LLMLocalRateLimitError(
        `Rate limit exceeded; retry after ${result.retryAfterMs}ms`,
      );
    }
  }

  /** Current token count (after refill) */
  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /** Bucket capacity */
  get max(): number {
    return this.capacity;
  }
}

/** Wraps an async function with a token-bucket gate */
export async function withRateLimit<T>(
  limiter: TokenBucketLimiter,
  fn: () => Promise<T>,
  cost = 1,
): Promise<T> {
  limiter.consumeOrThrow(cost);
  return fn();
}

/** A simple per-model rate limiter map */
export class ModelRateLimiterMap {
  private readonly limiters = new Map<string, TokenBucketLimiter>();
  private readonly defaultConfig: RateLimiterConfig;

  constructor(defaultConfig: RateLimiterConfig) {
    this.defaultConfig = defaultConfig;
  }

  /** Get or create a limiter for the given model */
  forModel(modelId: string, config?: RateLimiterConfig): TokenBucketLimiter {
    const existing = this.limiters.get(modelId);
    if (existing) return existing;

    const limiter = new TokenBucketLimiter(config ?? this.defaultConfig);
    this.limiters.set(modelId, limiter);
    return limiter;
  }

  /** Register a custom limiter for a specific model */
  register(modelId: string, limiter: TokenBucketLimiter): void {
    this.limiters.set(modelId, limiter);
  }
}
