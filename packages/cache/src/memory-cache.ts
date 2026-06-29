// LRU memory cache — bounded in-memory cache with optional per-entry TTL.
import { some, none } from "@veritas/core";
import type { Option } from "@veritas/core";
import type { Cache, CacheEntry } from "./cache.js";
import { expiresAt, isExpired } from "./ttl.js";

export interface MemoryCacheOptions {
  readonly maxSize: number;
  readonly defaultTtlMs?: number;
}

export class MemoryCache<V = unknown> implements Cache<V> {
  private readonly store: Map<string, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly defaultTtlMs: number | undefined;

  constructor(options: MemoryCacheOptions) {
    this.maxSize = options.maxSize;
    this.defaultTtlMs = options.defaultTtlMs;
    this.store = new Map();
  }

  async get(key: string): Promise<Option<V>> {
    const entry = this.store.get(key);
    if (entry === undefined) return none();
    if (isExpired(entry.expiresAt)) {
      this.store.delete(key);
      return none();
    }
    // LRU: re-insert to move to end of Map iteration order.
    this.store.delete(key);
    this.store.set(key, entry);
    return some(entry.value);
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    const resolvedTtl = ttlMs ?? this.defaultTtlMs;
    const entry: CacheEntry<V> = { value, expiresAt: expiresAt(resolvedTtl) };

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict least-recently-used (first entry in Map).
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) this.store.delete(lruKey);
    }
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (entry === undefined) return false;
    if (isExpired(entry.expiresAt)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<readonly string[]> {
    const now = Date.now();
    const result: string[] = [];
    for (const [k, entry] of this.store) {
      if (entry.expiresAt === undefined || now < entry.expiresAt) {
        result.push(k);
      }
    }
    return result;
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }
}

/** Factory function to create a new MemoryCache instance. */
export function createMemoryCache<V = unknown>(
  options: MemoryCacheOptions,
): MemoryCache<V> {
  return new MemoryCache<V>(options);
}
