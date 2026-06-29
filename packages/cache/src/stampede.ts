// Single-flight / stampede protection — collapses concurrent identical fetches into one.
import { isSome } from "@veritas/core";
import type { Cache } from "./cache.js";

interface InFlight<R> {
  readonly promise: Promise<R>;
}

/**
 * StampedeGuard wraps a Cache and ensures that concurrent callers requesting the same
 * key trigger only one underlying loader invocation; all waiters share the single result.
 */
export class StampedeGuard<V> {
  private readonly inFlight = new Map<string, InFlight<V>>();

  constructor(
    private readonly cache: Cache<V>,
    private readonly defaultTtlMs?: number,
  ) {}

  /**
   * Returns the cached value for `key`, or calls `loader` exactly once even if
   * multiple concurrent callers request the same key simultaneously.
   */
  async get(
    key: string,
    loader: () => Promise<V>,
    ttlMs?: number,
  ): Promise<V> {
    const hit = await this.cache.get(key);
    if (isSome(hit)) {
      return hit.value;
    }

    const existing = this.inFlight.get(key);
    if (existing !== undefined) {
      return existing.promise;
    }

    const promise = loader().then(
      async (value) => {
        await this.cache.set(key, value, ttlMs ?? this.defaultTtlMs);
        this.inFlight.delete(key);
        return value;
      },
      (err: unknown) => {
        this.inFlight.delete(key);
        throw err;
      },
    );

    this.inFlight.set(key, { promise });
    return promise;
  }

  /** Returns the number of in-flight requests currently pending. */
  inFlightCount(): number {
    return this.inFlight.size;
  }
}

/**
 * Creates a stampede-protected loader function bound to a specific cache.
 * Simpler alternative to instantiating StampedeGuard directly.
 */
export function singleFlight<A extends readonly unknown[], R>(
  cache: Cache<R>,
  keyFn: (...args: A) => string,
  loader: (...args: A) => Promise<R>,
  ttlMs?: number,
): (...args: A) => Promise<R> {
  const guard = new StampedeGuard<R>(cache, ttlMs);
  return (...args: A): Promise<R> =>
    guard.get(keyFn(...args), () => loader(...args), ttlMs);
}
