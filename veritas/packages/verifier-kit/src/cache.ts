// cache.ts: in-memory TTL cache for verifier results, keyed by claim hash + verifier id.
import type { IsoTimestamp } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { CacheEntry } from "./types.js";
import type { VerifierResult } from "./result.js";

interface CacheRecord {
  readonly entry: CacheEntry<VerifierResult>;
  readonly expiresAt: number; // ms since epoch
}

export interface VerifierCacheOptions {
  /** Default TTL in milliseconds. Defaults to 5 minutes. */
  readonly defaultTtlMs?: number;
  /** Maximum number of entries before LRU eviction. Defaults to 1 000. */
  readonly maxSize?: number;
}

/** In-memory LRU-TTL cache for VerifierResult values. */
export class VerifierCache {
  private readonly store = new Map<string, CacheRecord>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;

  constructor(opts: VerifierCacheOptions = {}) {
    this.defaultTtlMs = opts.defaultTtlMs ?? 5 * 60 * 1_000;
    this.maxSize = opts.maxSize ?? 1_000;
  }

  /** Builds a canonical cache key from verifier id and claim id. */
  static key(verifierId: string, claimId: string): string {
    return `${verifierId}::${claimId}`;
  }

  /** Returns a cached result if present and not expired, otherwise undefined. */
  get(verifierId: string, claimId: string): VerifierResult | undefined {
    const k = VerifierCache.key(verifierId, claimId);
    const record = this.store.get(k);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      this.store.delete(k);
      return undefined;
    }
    // LRU: re-insert to move to end.
    this.store.delete(k);
    this.store.set(k, record);
    return record.entry.value;
  }

  /** Stores a result with an optional per-entry TTL override. */
  set(verifierId: string, claimId: string, value: VerifierResult, ttlMs?: number): void {
    const k = VerifierCache.key(verifierId, claimId);
    const resolvedTtl = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();
    const entry: CacheEntry<VerifierResult> = {
      value,
      storedAt: epochToIso(now) as IsoTimestamp,
      ttlMs: resolvedTtl,
    };
    // Evict oldest (first-inserted) entry when at capacity.
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(k, { entry, expiresAt: now + resolvedTtl });
  }

  /** Removes a specific entry. */
  invalidate(verifierId: string, claimId: string): void {
    this.store.delete(VerifierCache.key(verifierId, claimId));
  }

  /** Purges all expired entries and returns the number removed. */
  prune(): number {
    const now = Date.now();
    let removed = 0;
    for (const [k, record] of this.store) {
      if (now > record.expiresAt) {
        this.store.delete(k);
        removed++;
      }
    }
    return removed;
  }

  /** Current count of live (non-expired) entries. */
  get size(): number {
    return this.store.size;
  }

  /** Clears all entries. */
  clear(): void {
    this.store.clear();
  }
}
