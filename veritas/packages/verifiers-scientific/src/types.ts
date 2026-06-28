// Scientific verifier domain types: structured representations of scientific claims and metadata.
import { z } from "zod";
import { scoreSchema, isoTimestampSchema } from "@veritas/core";

/** Recognized scientific claim sub-domains for routing and scoring. */
export const ScientificDomainSchema = z.enum([
  "biology",
  "chemistry",
  "physics",
  "medicine",
  "psychology",
  "neuroscience",
  "climate",
  "statistics",
  "computer_science",
  "general_science",
]);
export type ScientificDomain = z.infer<typeof ScientificDomainSchema>;

/** Publication status of a referenced paper. */
export const PublicationStatusSchema = z.enum([
  "published",
  "preprint",
  "retracted",
  "corrected",
  "unknown",
]);
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

/** Peer-review tier affecting confidence weighting. */
export const PeerReviewTierSchema = z.enum([
  "high_impact",
  "peer_reviewed",
  "preprint_only",
  "non_peer_reviewed",
  "unknown",
]);
export type PeerReviewTier = z.infer<typeof PeerReviewTierSchema>;

/** Structured metadata about a scientific paper retrieved from a source. */
export const PaperMetadataSchema = z.object({
  doi: z.string().optional(),
  pmid: z.string().optional(),
  arxivId: z.string().optional(),
  title: z.string().min(1),
  authors: z.array(z.string()),
  journal: z.string().optional(),
  year: z.number().int().min(1800).max(2100).optional(),
  citationCount: z.number().int().nonnegative().optional(),
  publicationStatus: PublicationStatusSchema,
  peerReviewTier: PeerReviewTierSchema,
  abstract: z.string().optional(),
  isRetracted: z.boolean(),
  retractionReason: z.string().optional(),
  retrievedAt: isoTimestampSchema,
});
export type PaperMetadata = z.infer<typeof PaperMetadataSchema>;

/** Parsed representation of a scientific claim extracted from raw text. */
export const ParsedScientificClaimSchema = z.object({
  rawText: z.string().min(1),
  hypothesis: z.string().optional(),
  mentionedDois: z.array(z.string()),
  mentionedPmids: z.array(z.string()),
  mentionedArxivIds: z.array(z.string()),
  statisticalTerms: z.array(z.string()),
  causalLanguage: z.boolean(),
  quantitativeClaims: z.array(z.string()),
  detectedDomain: ScientificDomainSchema,
  confidenceInDomainDetection: scoreSchema,
});
export type ParsedScientificClaim = z.infer<typeof ParsedScientificClaimSchema>;

/** Aggregated scientific verdict context returned alongside signals. */
export const ScientificVerdictContextSchema = z.object({
  papersFound: z.number().int().nonnegative(),
  retractedPapers: z.number().int().nonnegative(),
  highImpactSupport: z.number().int().nonnegative(),
  preprintOnlySupport: z.number().int().nonnegative(),
  contradictingPapers: z.number().int().nonnegative(),
  hasReplication: z.boolean(),
  domain: ScientificDomainSchema,
});
export type ScientificVerdictContext = z.infer<typeof ScientificVerdictContextSchema>;
