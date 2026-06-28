// Async memoize — wraps an async function so identical arguments share a single cache entry.
import type { Cache } from "./cache.js";
import { isSome } from "@veritas/core";

export interface MemoizeOptions {
  readonly ttlMs?: number;
  readonly keyFn?: (...args: readonly unknown[]) => string;
}

const defaultKeyFn = (...args: readonly unknown[]): string =>
  JSON.stringify(args);

/**
 * Returns a memoized version of `fn`. Concurrent calls with the same key are NOT
 * deduplicated here — use stampede.ts for that. Each call checks the cache independently.
 */
export function memoize<A extends readonly unknown[], R>(
  fn: (...args: A) => Promise<R>,
  cache: Cache<R>,
  options: MemoizeOptions = {},
): (...args: A) => Promise<R> {
  const keyFn = options.keyFn ?? defaultKeyFn;

  return async (...args: A): Promise<R> => {
    const key = keyFn(...args);
    const hit = await cache.get(key);
    if (isSome(hit)) {
      return hit.value;
    }
    const result = await fn(...args);
    await cache.set(key, result, options.ttlMs);
    return result;
  };
}

/**
 * Clears a specific memoized entry by reconstructing its cache key.
 */
export async function memoizeClear<A extends readonly unknown[]>(
  cache: Cache<unknown>,
  args: A,
  options: MemoizeOptions = {},
): Promise<boolean> {
  const keyFn = options.keyFn ?? defaultKeyFn;
  return cache.delete(keyFn(...args));
}
