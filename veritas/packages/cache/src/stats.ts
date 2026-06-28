// Cache hit/miss statistics tracker with atomic counters and rate calculations.
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly sets: number;
  readonly deletes: number;
  readonly evictions: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly totalRequests: number;
}

export interface StatsTracker {
  recordHit(): void;
  recordMiss(): void;
  recordSet(): void;
  recordDelete(): void;
  recordEviction(): void;
  snapshot(): CacheStats;
  reset(): void;
}

export function createStatsTracker(): StatsTracker {
  let hits = 0;
  let misses = 0;
  let sets = 0;
  let deletes = 0;
  let evictions = 0;

  return {
    recordHit(): void {
      hits += 1;
    },
    recordMiss(): void {
      misses += 1;
    },
    recordSet(): void {
      sets += 1;
    },
    recordDelete(): void {
      deletes += 1;
    },
    recordEviction(): void {
      evictions += 1;
    },
    snapshot(): CacheStats {
      const totalRequests = hits + misses;
      const hitRate = totalRequests === 0 ? 0 : hits / totalRequests;
      const missRate = totalRequests === 0 ? 0 : misses / totalRequests;
      return { hits, misses, sets, deletes, evictions, hitRate, missRate, totalRequests };
    },
    reset(): void {
      hits = 0;
      misses = 0;
      sets = 0;
      deletes = 0;
      evictions = 0;
    },
  };
}
