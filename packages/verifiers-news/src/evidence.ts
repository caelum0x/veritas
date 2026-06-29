// News evidence model: typed evidence structures for outlet credibility, cross-source corroboration, and recency.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** Evidence from a primary news outlet article. */
export const OutletEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("news-outlet"),
  metadata: z.object({
    outletName: z.string(),
    outletTier: z.enum(["tier1", "tier2", "tier3", "unknown"]),
    author: z.string().optional(),
    section: z.string().optional(),
    wordCount: z.number().int().nonnegative().optional(),
    hasByline: z.boolean(),
    isOpinion: z.boolean(),
    isSatire: z.boolean(),
  }),
});
export type OutletEvidence = z.infer<typeof OutletEvidenceSchema>;

/** Evidence from cross-source corroboration: multiple outlets reporting the same claim. */
export const CrossSourceEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("cross-source"),
  metadata: z.object({
    corroboratingOutlets: z.array(z.string()),
    corroborationCount: z.number().int().nonnegative(),
    contradictingOutlets: z.array(z.string()),
    contradictionCount: z.number().int().nonnegative(),
    wireServiceConfirmed: z.boolean(),
  }),
});
export type CrossSourceEvidence = z.infer<typeof CrossSourceEvidenceSchema>;

/** Evidence related to recency and temporal relevance of the claim. */
export const RecencyEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("news-recency"),
  metadata: z.object({
    claimDate: isoTimestampSchema.nullable(),
    oldestConfirmingSource: isoTimestampSchema.nullable(),
    newestConfirmingSource: isoTimestampSchema.nullable(),
    ageHours: z.number().nonnegative().nullable(),
    isCurrentlyReported: z.boolean(),
    hasUpdates: z.boolean(),
    updateCount: z.number().int().nonnegative(),
  }),
});
export type RecencyEvidence = z.infer<typeof RecencyEvidenceSchema>;

/** Wire service evidence confirming claim via AP, Reuters, or AFP. */
export const WireEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("wire-service"),
  metadata: z.object({
    wireService: z.enum(["ap", "reuters", "afp", "bloomberg", "other"]),
    dateline: z.string().optional(),
    storyId: z.string().optional(),
    wordCount: z.number().int().nonnegative().optional(),
  }),
});
export type WireEvidence = z.infer<typeof WireEvidenceSchema>;

/** Union of all news evidence types. */
export type NewsEvidence = OutletEvidence | CrossSourceEvidence | RecencyEvidence | WireEvidence;

/** Aggregate news evidence result from all sources. */
export interface NewsEvidenceResult {
  readonly claimId: string;
  readonly mentionedOutlets: ReadonlyArray<string>;
  readonly outletEvidence: ReadonlyArray<OutletEvidence>;
  readonly crossSourceEvidence: ReadonlyArray<CrossSourceEvidence>;
  readonly recencyEvidence: ReadonlyArray<RecencyEvidence>;
  readonly wireEvidence: ReadonlyArray<WireEvidence>;
  readonly overallRelevance: number;
}

/** Build a NewsEvidenceResult (pure, immutable). */
export function makeNewsEvidenceResult(
  claimId: string,
  mentionedOutlets: ReadonlyArray<string>,
  outletEvidence: ReadonlyArray<OutletEvidence>,
  crossSourceEvidence: ReadonlyArray<CrossSourceEvidence>,
  recencyEvidence: ReadonlyArray<RecencyEvidence>,
  wireEvidence: ReadonlyArray<WireEvidence>,
): NewsEvidenceResult {
  const allScores = [
    ...outletEvidence.map((e) => e.relevanceScore),
    ...crossSourceEvidence.map((e) => e.relevanceScore),
    ...recencyEvidence.map((e) => e.relevanceScore),
    ...wireEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    mentionedOutlets: [...mentionedOutlets],
    outletEvidence: [...outletEvidence],
    crossSourceEvidence: [...crossSourceEvidence],
    recencyEvidence: [...recencyEvidence],
    wireEvidence: [...wireEvidence],
    overallRelevance,
  });
}
