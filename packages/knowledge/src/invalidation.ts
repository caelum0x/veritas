// Invalidates stale or superseded knowledge records from the store.

import type { ContentHash } from "@veritas/core";
import type { KnowledgeStore } from "./store.js";
import type { KnowledgeRecord } from "./knowledge-record.js";
import type { TtlPolicy } from "./ttl.js";
import { DEFAULT_TTL_POLICY, isFresh } from "./ttl.js";

/** Summary of an invalidation pass. */
export interface InvalidationResult {
  readonly removedCount: number;
  readonly removedFingerprints: ReadonlyArray<ContentHash>;
  readonly durationMs: number;
}

/** Criteria for selecting records to invalidate. */
export interface InvalidationCriteria {
  /** Remove records that have exceeded their TTL. */
  readonly removeStale?: boolean;
  /** Remove records whose verdict matches one of these values. */
  readonly verdicts?: ReadonlyArray<string>;
  /** Remove records whose source IDs overlap with these. */
  readonly sourceIds?: ReadonlyArray<string>;
  /** Remove records whose claimId is in this set. */
  readonly claimIds?: ReadonlyArray<string>;
  /** Custom predicate: return true to remove the record. */
  readonly predicate?: (record: KnowledgeRecord) => boolean;
}

/** Evaluates whether a record matches the invalidation criteria. */
function shouldInvalidate(
  record: KnowledgeRecord,
  criteria: InvalidationCriteria,
  ttlPolicy: TtlPolicy,
  nowMs: number,
): boolean {
  if (criteria.removeStale && !isFresh(record.cachedAt, record.confidence, ttlPolicy, nowMs)) {
    return true;
  }
  if (criteria.verdicts && criteria.verdicts.includes(record.verdict)) {
    return true;
  }
  if (criteria.claimIds && record.claimId && criteria.claimIds.includes(record.claimId)) {
    return true;
  }
  if (criteria.predicate && criteria.predicate(record)) {
    return true;
  }
  return false;
}

/**
 * Scans the store and removes all records matching the given criteria.
 * Returns a summary of what was removed.
 */
export function invalidateRecords(
  store: KnowledgeStore,
  criteria: InvalidationCriteria,
  opts: { readonly ttlPolicy?: TtlPolicy; readonly nowMs?: number } = {},
): InvalidationResult {
  const startMs = Date.now();
  const ttlPolicy = opts.ttlPolicy ?? DEFAULT_TTL_POLICY;
  const nowMs = opts.nowMs ?? startMs;

  const toRemove: ContentHash[] = [];
  for (const record of store.list()) {
    if (shouldInvalidate(record, criteria, ttlPolicy, nowMs)) {
      toRemove.push(record.fingerprint);
    }
  }

  for (const fingerprint of toRemove) {
    store.remove(fingerprint);
  }

  return Object.freeze({
    removedCount: toRemove.length,
    removedFingerprints: Object.freeze([...toRemove]),
    durationMs: Date.now() - startMs,
  });
}

/**
 * Convenience: removes all stale records from the store without
 * requiring any other criteria.
 */
export function evictStaleRecords(
  store: KnowledgeStore,
  ttlPolicy: TtlPolicy = DEFAULT_TTL_POLICY,
  nowMs: number = Date.now(),
): InvalidationResult {
  return invalidateRecords(store, { removeStale: true }, { ttlPolicy, nowMs });
}

/**
 * Removes every record associated with a specific verification run, allowing
 * the claim to be re-verified from scratch.
 */
export function invalidateByVerificationId(
  store: KnowledgeStore,
  verificationId: string,
): InvalidationResult {
  return invalidateRecords(store, {
    predicate: (r) => r.verificationId === verificationId,
  });
}
