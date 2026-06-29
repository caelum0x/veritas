// Legal evidence model: typed evidence structures for statutes, case law, and jurisdictions.

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** Statute evidence with citation and jurisdiction metadata. */
export const StatuteEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("statute"),
  metadata: z.object({
    jurisdiction: z.string(),
    code: z.string(),
    section: z.string(),
    title: z.string(),
    effectiveDate: isoTimestampSchema.nullable(),
    repealedDate: isoTimestampSchema.nullable(),
    citationString: z.string(),
  }),
});
export type StatuteEvidence = z.infer<typeof StatuteEvidenceSchema>;

/** Case law evidence with docket and court metadata. */
export const CaseLawEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("case-law"),
  metadata: z.object({
    court: z.string(),
    jurisdiction: z.string(),
    docketNumber: z.string(),
    decisionDate: isoTimestampSchema.nullable(),
    citation: z.string(),
    parties: z.string(),
    precedentialStatus: z.enum(["binding", "persuasive", "non-precedential"]),
  }),
});
export type CaseLawEvidence = z.infer<typeof CaseLawEvidenceSchema>;

/** Jurisdiction profile evidence (legal system, court hierarchy). */
export const JurisdictionEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("jurisdiction"),
  metadata: z.object({
    jurisdictionCode: z.string(),
    jurisdictionName: z.string(),
    legalSystem: z.enum(["common-law", "civil-law", "mixed", "religious", "customary"]),
    country: z.string(),
    subdivisionType: z.string().optional(),
  }),
});
export type JurisdictionEvidence = z.infer<typeof JurisdictionEvidenceSchema>;

/** Union of all legal evidence types. */
export type LegalEvidence = StatuteEvidence | CaseLawEvidence | JurisdictionEvidence;

/** Aggregate result from all legal evidence sources. */
export interface LegalEvidenceResult {
  readonly claimId: string;
  readonly jurisdiction: string | null;
  readonly statuteEvidence: ReadonlyArray<StatuteEvidence>;
  readonly caseLawEvidence: ReadonlyArray<CaseLawEvidence>;
  readonly jurisdictionEvidence: ReadonlyArray<JurisdictionEvidence>;
  readonly overallRelevance: number;
}

/** Build a LegalEvidenceResult (pure, immutable). */
export function makeLegalEvidenceResult(
  claimId: string,
  jurisdiction: string | null,
  statuteEvidence: ReadonlyArray<StatuteEvidence>,
  caseLawEvidence: ReadonlyArray<CaseLawEvidence>,
  jurisdictionEvidence: ReadonlyArray<JurisdictionEvidence>,
): LegalEvidenceResult {
  const allScores = [
    ...statuteEvidence.map((e) => e.relevanceScore),
    ...caseLawEvidence.map((e) => e.relevanceScore),
    ...jurisdictionEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    jurisdiction,
    statuteEvidence: [...statuteEvidence],
    caseLawEvidence: [...caseLawEvidence],
    jurisdictionEvidence: [...jurisdictionEvidence],
    overallRelevance,
  });
}
