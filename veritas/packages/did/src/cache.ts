// In-memory TTL cache for resolved DID Documents to reduce redundant resolution round-trips.
import type { DidDocument } from "./document.js";
import type { DidResolutionResult } from "./resolver.js";

/** A single cache entry holding a resolution result and its expiry epoch ms. */
interface CacheEntry {
  readonly result: DidResolutionResult;
  readonly expiresAt: number;
}

/** Options for the DID resolution cache. */
export interface DidCacheOptions {
  /** Time-to-live in milliseconds. Default: 5 minutes. */
  readonly ttlMs?: number;
  /** Maximum number of entries to retain. Default: 512. */
  readonly maxSize?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_SIZE = 512;

/** In-memory LRU-ish TTL cache for DID resolution results. */
export class DidResolutionCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options: DidCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }

  /** Store a resolution result, overwriting any previous entry for this DID. */
  set(did: string, result: DidResolutionResult): void {
    if (this.store.size >= this.maxSize) {
      // Evict the oldest entry (insertion-order first key).
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(did, { result, expiresAt: Date.now() + this.ttlMs });
  }

  /** Retrieve a cached resolution result, or undefined if absent/expired. */
  get(did: string): DidResolutionResult | undefined {
    const entry = this.store.get(did);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(did);
      return undefined;
    }
    return entry.result;
  }

  /** Remove a specific DID from the cache. */
  invalidate(did: string): void {
    this.store.delete(did);
  }

  /** Remove all expired entries from the cache. */
  prune(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Clear every entry in the cache. */
  clear(): void {
    this.store.clear();
  }

  /** Current number of entries (including potentially expired ones). */
  get size(): number {
    return this.store.size;
  }

  /** Return true if the cache has a live (non-expired) entry for this DID. */
  has(did: string): boolean {
    return this.get(did) !== undefined;
  }
}
