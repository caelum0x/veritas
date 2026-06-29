// Scientific evidence model: typed evidence structures for PubMed, Crossref, arXiv, and retraction data.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** PubMed abstract evidence with PMID and MeSH metadata. */
export const PubMedEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("pubmed-abstract"),
  metadata: z.object({
    pmid: z.string(),
    doi: z.string().optional(),
    title: z.string(),
    authors: z.array(z.string()),
    journal: z.string(),
    publicationDate: isoTimestampSchema.nullable(),
    meshTerms: z.array(z.string()),
    citationCount: z.number().int().nonnegative().optional(),
    isRetracted: z.boolean(),
  }),
});
export type PubMedEvidence = z.infer<typeof PubMedEvidenceSchema>;

/** Crossref DOI evidence with citation and publisher metadata. */
export const CrossrefEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("crossref-doi"),
  metadata: z.object({
    doi: z.string(),
    title: z.string(),
    authors: z.array(z.string()),
    publisher: z.string(),
    containerTitle: z.string().optional(),
    publicationDate: isoTimestampSchema.nullable(),
    citedByCount: z.number().int().nonnegative(),
    type: z.string(),
    isOpenAccess: z.boolean(),
  }),
});
export type CrossrefEvidence = z.infer<typeof CrossrefEvidenceSchema>;

/** arXiv preprint evidence — not peer-reviewed. */
export const ArxivEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("arxiv-preprint"),
  metadata: z.object({
    arxivId: z.string(),
    doi: z.string().optional(),
    title: z.string(),
    authors: z.array(z.string()),
    categories: z.array(z.string()),
    submittedAt: isoTimestampSchema,
    isPeerReviewed: z.literal(false),
    abstract: z.string(),
  }),
});
export type ArxivEvidence = z.infer<typeof ArxivEvidenceSchema>;

/** Retraction notice evidence from Retraction Watch or similar. */
export const RetractionEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("retraction-notice"),
  metadata: z.object({
    doi: z.string().optional(),
    pmid: z.string().optional(),
    title: z.string(),
    journal: z.string(),
    retractionDate: isoTimestampSchema,
    retractionReason: z.string(),
    retractionDoi: z.string().optional(),
  }),
});
export type RetractionEvidence = z.infer<typeof RetractionEvidenceSchema>;

/** Union of all scientific evidence types. */
export type ScientificEvidence =
  | PubMedEvidence
  | CrossrefEvidence
  | ArxivEvidence
  | RetractionEvidence;

/** Aggregate scientific evidence result from all domain sources. */
export interface ScientificEvidenceResult {
  readonly claimId: string;
  readonly doi: string | null;
  readonly pmid: string | null;
  readonly pubmedEvidence: ReadonlyArray<PubMedEvidence>;
  readonly crossrefEvidence: ReadonlyArray<CrossrefEvidence>;
  readonly arxivEvidence: ReadonlyArray<ArxivEvidence>;
  readonly retractionEvidence: ReadonlyArray<RetractionEvidence>;
  readonly overallRelevance: number;
}

/** Build a ScientificEvidenceResult (pure, immutable). */
export function makeScientificEvidenceResult(
  claimId: string,
  doi: string | null,
  pmid: string | null,
  pubmedEvidence: ReadonlyArray<PubMedEvidence>,
  crossrefEvidence: ReadonlyArray<CrossrefEvidence>,
  arxivEvidence: ReadonlyArray<ArxivEvidence>,
  retractionEvidence: ReadonlyArray<RetractionEvidence>,
): ScientificEvidenceResult {
  const allScores = [
    ...pubmedEvidence.map((e) => e.relevanceScore),
    ...crossrefEvidence.map((e) => e.relevanceScore),
    ...arxivEvidence.map((e) => e.relevanceScore),
    ...retractionEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    doi,
    pmid,
    pubmedEvidence: [...pubmedEvidence],
    crossrefEvidence: [...crossrefEvidence],
    arxivEvidence: [...arxivEvidence],
    retractionEvidence: [...retractionEvidence],
    overallRelevance,
  });
}
