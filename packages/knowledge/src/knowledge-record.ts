// Defines the KnowledgeRecord structure: a cached verified claim with provenance metadata.

import type { ContentHash, IsoTimestamp, Verdict, ClaimId, VerificationId } from "@veritas/core";
import { epochToIso } from "@veritas/core";

/** A verified claim stored in the knowledge base. */
export interface KnowledgeRecord {
  readonly id: string;
  readonly fingerprint: ContentHash;
  readonly claimText: string;
  readonly claimId: ClaimId | null;
  readonly verificationId: VerificationId | null;
  readonly verdict: Verdict;
  readonly confidence: number;
  readonly summary: string;
  readonly citationUrls: ReadonlyArray<string>;
  readonly cachedAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly hitCount: number;
}

/** Input for creating a new KnowledgeRecord. */
export interface CreateKnowledgeRecord {
  readonly id: string;
  readonly fingerprint: ContentHash;
  readonly claimText: string;
  readonly claimId?: ClaimId;
  readonly verificationId?: VerificationId;
  readonly verdict: Verdict;
  readonly confidence: number;
  readonly summary: string;
  readonly citationUrls?: ReadonlyArray<string>;
}

/** Constructs a new KnowledgeRecord with timestamps set to now. */
export function makeKnowledgeRecord(
  input: CreateKnowledgeRecord,
  nowMs: number = Date.now(),
): KnowledgeRecord {
  const ts = epochToIso(nowMs);
  return Object.freeze({
    id: input.id,
    fingerprint: input.fingerprint,
    claimText: input.claimText,
    claimId: input.claimId ?? null,
    verificationId: input.verificationId ?? null,
    verdict: input.verdict,
    confidence: input.confidence,
    summary: input.summary,
    citationUrls: Object.freeze([...(input.citationUrls ?? [])]),
    cachedAt: ts,
    updatedAt: ts,
    hitCount: 0,
  });
}

/** Returns a new record with hitCount incremented and updatedAt refreshed. */
export function recordHit(
  record: KnowledgeRecord,
  nowMs: number = Date.now(),
): KnowledgeRecord {
  return Object.freeze({
    ...record,
    hitCount: record.hitCount + 1,
    updatedAt: epochToIso(nowMs),
  });
}
