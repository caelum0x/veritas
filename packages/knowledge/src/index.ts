// Public surface of the @veritas/knowledge package.

export {
  KnowledgeError,
  KnowledgeNotFoundError,
  KnowledgeStaleError,
  InvalidationError,
  StoreCapacityError,
} from "./errors.js";

export type { KnowledgeRecord, CreateKnowledgeRecord } from "./knowledge-record.js";
export { makeKnowledgeRecord, recordHit } from "./knowledge-record.js";

export type { TtlPolicy } from "./ttl.js";
export { DEFAULT_TTL_POLICY, effectiveTtlMs, isFresh, expiresAtMs } from "./ttl.js";

export type { FactCache } from "./fact-cache.js";
export { InMemoryFactCache } from "./fact-cache.js";

export { fingerprintClaim, fingerprintClaimWithContext } from "./claim-fingerprint.js";

export type { LookupHit, LookupError } from "./lookup.js";
export {
  lookupByFingerprint,
  lookupByClaim,
  lookupByClaimWithContext,
  hasCachedVerdict,
} from "./lookup.js";

export type { BlendWeights } from "./confidence-blend.js";
export {
  DEFAULT_BLEND_WEIGHTS,
  blendConfidence,
  discountCachedConfidence,
  reconcileVerdicts,
} from "./confidence-blend.js";

export type {
  KnowledgeLookupHit,
  KnowledgeQueryResult,
  KnowledgeQueryParams,
  KnowledgeStats,
} from "./types.js";

export type { KnowledgeStore, InMemoryKnowledgeStoreOptions } from "./store.js";
export { InMemoryKnowledgeStore } from "./store.js";

export type { InvalidationResult, InvalidationCriteria } from "./invalidation.js";
export {
  invalidateRecords,
  evictStaleRecords,
  invalidateByVerificationId,
} from "./invalidation.js";

export type { StatsCounters } from "./stats.js";
export type { QueryOptions } from "./query.js";
export {
  makeCounters,
  recordHitStat,
  recordMissStat,
  recordInvalidationStat,
  computeStats,
  hitRate,
} from "./stats.js";

export {
  queryKnowledgeStore,
  queryByFingerprint,
  mergeQueryResults,
} from "./query.js";
