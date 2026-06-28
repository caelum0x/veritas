// Cache-aside helper — read-through / write-through pattern over a Cache instance.
import { isSome } from "@veritas/core";
import type { Cache } from "./cache.js";

export interface CacheAsideOptions {
  readonly ttlMs?: number;
}

/**
 * Reads a value from cache; on miss, calls `loader`, stores the result, and returns it.
 * Returns the loaded value directly (not an Option) so callers don't need to unwrap.
 */
export async function cacheAside<V>(
  cache: Cache<V>,
  key: string,
  loader: () => Promise<V>,
  options: CacheAsideOptions = {},
): Promise<V> {
  const hit = await cache.get(key);
  if (isSome(hit)) {
    return hit.value;
  }
  const value = await loader();
  await cache.set(key, value, options.ttlMs);
  return value;
}

/**
 * Invalidates a cache key and reloads from the source, storing the fresh value.
 */
export async function cacheAsideRefresh<V>(
  cache: Cache<V>,
  key: string,
  loader: () => Promise<V>,
  options: CacheAsideOptions = {},
): Promise<V> {
  await cache.delete(key);
  const value = await loader();
  await cache.set(key, value, options.ttlMs);
  return value;
}

/**
 * Write-through: stores the value in both cache and the backing store atomically.
 * The writer callback is responsible for persisting the value.
 */
export async function cacheAsideWrite<V>(
  cache: Cache<V>,
  key: string,
  value: V,
  writer: (value: V) => Promise<void>,
  options: CacheAsideOptions = {},
): Promise<void> {
  await writer(value);
  await cache.set(key, value, options.ttlMs);
}
