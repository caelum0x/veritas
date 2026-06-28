// Shared evidence model: structured fact-check evidence collected during domain verification.

import { z } from "zod";
import { scoreSchema, isoTimestampSchema } from "@veritas/core";

/** Stance a piece of evidence takes toward the claim under review. */
export const EvidenceStanceSchema = z.enum(["supports", "refutes", "neutral", "inconclusive"]);
export type EvidenceStance = z.infer<typeof EvidenceStanceSchema>;

/** A single atomic piece of evidence from an external domain source. */
export const DomainEvidenceSchema = z.object({
  /** Unique key within a verifier run (e.g. "edgar:filing:0001234"). */
  id: z.string().min(1),
  /** Human-readable label for the evidence item. */
  label: z.string().min(1),
  /** URI or stable identifier pointing to the primary source. */
  sourceUri: z.string().min(1),
  /** Domain category of the source (e.g. "sec-filing", "pubmed-abstract"). */
  sourceType: z.string().min(1),
  /** Extracted excerpt or summary directly relevant to the claim. */
  excerpt: z.string(),
  /** How strongly this evidence corroborates or contradicts the claim. */
  relevanceScore: scoreSchema,
  /** Stance of this evidence with respect to the claim. */
  stance: EvidenceStanceSchema,
  /** When the source document was originally published, if known. */
  publishedAt: isoTimestampSchema.nullable(),
  /** When this evidence was retrieved from the external source. */
  retrievedAt: isoTimestampSchema,
  /** Arbitrary domain-specific metadata (filing number, DOI, tx hash, …). */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type DomainEvidence = z.infer<typeof DomainEvidenceSchema>;

/** Immutable collection of evidence items produced by one verifier invocation. */
export interface EvidenceBundle {
  readonly verifierId: string;
  readonly claimText: string;
  readonly items: ReadonlyArray<DomainEvidence>;
  readonly retrievedAt: string;
}

/** Build an EvidenceBundle from raw items (pure, no mutation). */
export function makeEvidenceBundle(
  verifierId: string,
  claimText: string,
  items: ReadonlyArray<DomainEvidence>,
  retrievedAt: string,
): EvidenceBundle {
  return Object.freeze({ verifierId, claimText, items: [...items], retrievedAt });
}
