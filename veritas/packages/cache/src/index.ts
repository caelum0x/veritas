// Public surface of @veritas/cache — re-exports all cache primitives and utilities.
export type { Cache } from "./cache.js";
export { createMemoryCache } from "./memory-cache.js";
export { ttlFromSeconds, ttlFromMinutes, ttlFromHours, isExpired, nowMs } from "./ttl.js";
export { buildKey, joinKeyParts } from "./key.js";
export { createNamespacedCache } from "./namespaced-cache.js";
export { cacheAside } from "./cache-aside.js";
export { memoize } from "./memoize.js";
export { cached } from "./decorator.js";
export { singleFlight } from "./stampede.js";
export type { Serializer } from "./serializer.js";
export { jsonSerializer, noopSerializer } from "./serializer.js";
export type { CacheStats, StatsTracker } from "./stats.js";
export { createStatsTracker } from "./stats.js";
export { createMultiTierCache } from "./multi-tier.js";
export type { MultiTierOptions } from "./multi-tier.js";
export {
  CacheError,
  CacheSerializationError,
  CacheCapacityError,
  CacheKeyError,
  isCacheError,
} from "./errors.js";
