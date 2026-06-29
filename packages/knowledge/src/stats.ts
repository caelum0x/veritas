// Computes and tracks cache-hit/miss statistics for the knowledge store.

import type { IsoTimestamp } from "@veritas/core";
import type { KnowledgeStore } from "./store.js";
import type { KnowledgeStats } from "./types.js";
import type { TtlPolicy } from "./ttl.js";
import { DEFAULT_TTL_POLICY, isFresh } from "./ttl.js";

/** Mutable counters updated on each cache access; shared via reference. */
export interface StatsCounters {
  hitCount: number;
  missCount: number;
  invalidationCount: number;
}

/** Creates zeroed mutable counters. */
export function makeCounters(): StatsCounters {
  return { hitCount: 0, missCount: 0, invalidationCount: 0 };
}

/** Increments the hit counter and returns the updated value. */
export function recordHitStat(counters: StatsCounters): number {
  counters.hitCount += 1;
  return counters.hitCount;
}

/** Increments the miss counter and returns the updated value. */
export function recordMissStat(counters: StatsCounters): number {
  counters.missCount += 1;
  return counters.missCount;
}

/** Increments the invalidation counter by the given amount. */
export function recordInvalidationStat(counters: StatsCounters, count: number): void {
  counters.invalidationCount += count;
}

/**
 * Derives a KnowledgeStats snapshot from the current store contents
 * and accumulated counters.
 */
export function computeStats(
  store: KnowledgeStore,
  counters: StatsCounters,
  ttlPolicy: TtlPolicy = DEFAULT_TTL_POLICY,
  nowMs: number = Date.now(),
): KnowledgeStats {
  const records = store.list();
  let freshRecords = 0;
  let staleRecords = 0;
  let oldestCachedAt: IsoTimestamp | undefined;
  let newestCachedAt: IsoTimestamp | undefined;

  for (const record of records) {
    if (isFresh(record.cachedAt, record.confidence, ttlPolicy, nowMs)) {
      freshRecords += 1;
    } else {
      staleRecords += 1;
    }

    if (oldestCachedAt === undefined || record.cachedAt < oldestCachedAt) {
      oldestCachedAt = record.cachedAt;
    }
    if (newestCachedAt === undefined || record.cachedAt > newestCachedAt) {
      newestCachedAt = record.cachedAt;
    }
  }

  return Object.freeze({
    totalRecords: records.length,
    freshRecords,
    staleRecords,
    hitCount: counters.hitCount,
    missCount: counters.missCount,
    invalidationCount: counters.invalidationCount,
    oldestCachedAt,
    newestCachedAt,
  });
}

/** Returns the cache hit-rate ratio (0–1), or 0 when no lookups have occurred. */
export function hitRate(counters: StatsCounters): number {
  const total = counters.hitCount + counters.missCount;
  if (total === 0) return 0;
  return counters.hitCount / total;
}
