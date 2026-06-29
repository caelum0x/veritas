// Semantic and exact-match querying of the knowledge store with ranking and filtering.

import type { KnowledgeStore } from "./store.js";
import type { KnowledgeRecord } from "./knowledge-record.js";
import type { KnowledgeQueryParams, KnowledgeQueryResult, KnowledgeLookupHit } from "./types.js";
import type { TtlPolicy } from "./ttl.js";
import { DEFAULT_TTL_POLICY, isFresh } from "./ttl.js";
import { fingerprintClaim } from "./claim-fingerprint.js";

/** Options controlling how queries are executed against the store. */
export interface QueryOptions {
  readonly ttlPolicy?: TtlPolicy;
  readonly nowMs?: number;
}

/**
 * Performs a full-text substring search against the store, ranking results by
 * confidence descending.  Suitable for small in-memory stores; for large
 * deployments replace with a vector-search backed implementation.
 */
export function queryKnowledgeStore(
  store: KnowledgeStore,
  params: KnowledgeQueryParams,
  opts: QueryOptions = {},
): KnowledgeQueryResult {
  const startMs = Date.now();
  const ttlPolicy = opts.ttlPolicy ?? DEFAULT_TTL_POLICY;
  const nowMs = opts.nowMs ?? startMs;
  const topK = params.topK ?? 10;
  const minSimilarity = params.minSimilarity ?? 0;
  const freshOnly = params.freshOnly ?? true;

  const needle = params.claimText.trim().toLowerCase();
  const allRecords = store.list();

  const hits: KnowledgeLookupHit[] = [];

  for (const record of allRecords) {
    const isRecordFresh = isFresh(record.cachedAt, record.confidence, ttlPolicy, nowMs);
    if (freshOnly && !isRecordFresh) continue;

    const similarity = computeTextSimilarity(needle, record.claimText.toLowerCase());
    if (similarity < minSimilarity) continue;

    hits.push(
      Object.freeze({ record, similarity, isFresh: isRecordFresh }),
    );
  }

  // Sort by similarity descending, break ties by confidence descending.
  hits.sort((a, b) => {
    const simDiff = b.similarity - a.similarity;
    if (Math.abs(simDiff) > 1e-9) return simDiff;
    return b.record.confidence - a.record.confidence;
  });

  return Object.freeze({
    hits: Object.freeze(hits.slice(0, topK)),
    totalScanned: allRecords.length,
    durationMs: Date.now() - startMs,
  });
}

/**
 * Performs an exact fingerprint lookup against the store, returning a single
 * hit when found or an empty result.
 */
export function queryByFingerprint(
  store: KnowledgeStore,
  claimText: string,
  opts: QueryOptions = {},
): KnowledgeQueryResult {
  const startMs = Date.now();
  const ttlPolicy = opts.ttlPolicy ?? DEFAULT_TTL_POLICY;
  const nowMs = opts.nowMs ?? startMs;
  const fingerprint = fingerprintClaim(claimText);

  const result = store.get(fingerprint);
  const hits: KnowledgeLookupHit[] = [];

  if (result.ok) {
    const record = result.value;
    const isRecordFresh = isFresh(record.cachedAt, record.confidence, ttlPolicy, nowMs);
    hits.push(Object.freeze({ record, similarity: 1, isFresh: isRecordFresh }));
  }

  return Object.freeze({
    hits: Object.freeze(hits),
    totalScanned: 1,
    durationMs: Date.now() - startMs,
  });
}

/**
 * Merges multiple query result sets, de-duplicating by record id and keeping
 * the highest-similarity hit for each.
 */
export function mergeQueryResults(
  ...results: ReadonlyArray<KnowledgeQueryResult>
): KnowledgeQueryResult {
  const startMs = Date.now();
  const seen = new Map<string, KnowledgeLookupHit>();
  let totalScanned = 0;

  for (const result of results) {
    totalScanned += result.totalScanned;
    for (const hit of result.hits) {
      const existing = seen.get(hit.record.id);
      if (existing === undefined || hit.similarity > existing.similarity) {
        seen.set(hit.record.id, hit);
      }
    }
  }

  const merged = Array.from(seen.values()).sort(
    (a, b) => b.similarity - a.similarity,
  );

  return Object.freeze({
    hits: Object.freeze(merged),
    totalScanned,
    durationMs: Date.now() - startMs,
  });
}

/**
 * Computes a simple character-overlap similarity between two strings.
 * Returns a value in [0, 1].  This is intentionally lightweight; replace
 * with cosine similarity over embeddings for production use.
 */
function computeTextSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Jaccard similarity on trigrams.
  const trigramsA = makeTrigrams(a);
  const trigramsB = makeTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const tg of trigramsA) {
    if (trigramsB.has(tg)) intersection += 1;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function makeTrigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= text.length - 3; i++) {
    set.add(text.slice(i, i + 3));
  }
  return set;
}
