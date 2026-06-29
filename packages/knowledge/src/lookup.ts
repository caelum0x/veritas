// Looks up a prior verified verdict from the knowledge fact cache by claim fingerprint.

import type { ContentHash, Result } from "@veritas/core";
import { ok, err, isOk } from "@veritas/core";
import type { FactCache } from "./fact-cache.js";
import { fingerprintClaim, fingerprintClaimWithContext } from "./claim-fingerprint.js";
import type { KnowledgeRecord } from "./knowledge-record.js";
import type { KnowledgeNotFoundError, KnowledgeStaleError } from "./errors.js";

/** Result of a successful prior-verdict lookup. */
export interface LookupHit {
  readonly record: KnowledgeRecord;
  readonly fingerprint: ContentHash;
}

export type LookupError = KnowledgeNotFoundError | KnowledgeStaleError;

/** Looks up a cached verdict by raw fingerprint. */
export function lookupByFingerprint(
  cache: FactCache,
  fingerprint: ContentHash,
): Result<LookupHit, LookupError> {
  const result = cache.get(fingerprint);
  if (!isOk(result)) return result;
  return ok({ record: result.value, fingerprint });
}

/** Derives a fingerprint from claim text, then looks up the cached verdict. */
export function lookupByClaim(
  cache: FactCache,
  claimText: string,
): Result<LookupHit, LookupError> {
  const fingerprint = fingerprintClaim(claimText);
  return lookupByFingerprint(cache, fingerprint);
}

/** Derives a fingerprint from claim text + context, then looks up the cached verdict. */
export function lookupByClaimWithContext(
  cache: FactCache,
  claimText: string,
  context: Readonly<Record<string, unknown>>,
): Result<LookupHit, LookupError> {
  const fingerprint = fingerprintClaimWithContext(claimText, context);
  return lookupByFingerprint(cache, fingerprint);
}

/** Returns true if the cache contains a fresh record for the given claim text. */
export function hasCachedVerdict(cache: FactCache, claimText: string): boolean {
  const fingerprint = fingerprintClaim(claimText);
  return cache.has(fingerprint);
}
