// rate-control.ts: token-bucket rate limiter for polite access to external data sources.
import { RateLimitExceededError } from "./errors.js";
import type { RateLimitConfig } from "./types.js";

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

/** Per-source token-bucket rate controller. Enforces requestsPerSecond with optional burst. */
export class RateController {
  private readonly buckets = new Map<string, BucketState>();
  private readonly configs = new Map<string, Required<RateLimitConfig>>();
  private readonly defaultConfig: Required<RateLimitConfig>;

  constructor(defaultConfig: RateLimitConfig) {
    this.defaultConfig = {
      requestsPerSecond: defaultConfig.requestsPerSecond,
      burstCapacity: defaultConfig.burstCapacity,
    };
  }

  /** Registers a source-specific rate limit configuration. */
  configure(sourceId: string, config: RateLimitConfig): void {
    this.configs.set(sourceId, {
      requestsPerSecond: config.requestsPerSecond,
      burstCapacity: config.burstCapacity,
    });
  }

  /**
   * Attempts to consume one token for the given source.
   * Throws RateLimitExceededError when no tokens remain.
   */
  acquire(sourceId: string): void {
    const config = this.configs.get(sourceId) ?? this.defaultConfig;
    const now = Date.now();
    let state = this.buckets.get(sourceId);

    if (!state) {
      state = { tokens: config.burstCapacity, lastRefillMs: now };
      this.buckets.set(sourceId, state);
    }

    // Refill tokens based on elapsed time.
    const elapsedSeconds = (now - state.lastRefillMs) / 1_000;
    const refill = elapsedSeconds * config.requestsPerSecond;
    const newTokens = Math.min(config.burstCapacity, state.tokens + refill);
    const updatedState: BucketState = { tokens: newTokens, lastRefillMs: now };

    if (updatedState.tokens < 1) {
      const waitMs = Math.ceil((1 - updatedState.tokens) / config.requestsPerSecond * 1_000);
      this.buckets.set(sourceId, updatedState);
      throw new RateLimitExceededError(sourceId, waitMs);
    }

    this.buckets.set(sourceId, { tokens: updatedState.tokens - 1, lastRefillMs: now });
  }

  /**
   * Waits (via sleep) until a token is available for sourceId, then acquires it.
   * Retries up to maxWaitMs before throwing.
   */
  async acquireAsync(sourceId: string, maxWaitMs = 30_000): Promise<void> {
    const start = Date.now();
    while (true) {
      try {
        this.acquire(sourceId);
        return;
      } catch (e) {
        if (!(e instanceof RateLimitExceededError)) throw e;
        const retryAfter = (e as { details?: { retryAfterMs?: number } }).details?.retryAfterMs ?? 200;
        if (Date.now() - start + retryAfter > maxWaitMs) throw e;
        await sleep(retryAfter);
      }
    }
  }

  /** Returns current token count for a source (for observability). */
  tokenCount(sourceId: string): number {
    return this.buckets.get(sourceId)?.tokens ?? this.defaultConfig.burstCapacity;
  }

  /** Resets bucket state for a source. */
  reset(sourceId: string): void {
    this.buckets.delete(sourceId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
