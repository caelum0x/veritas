// Core taxonomy types: ClassificationResult, TaxonomyNode, VerifierMapping, ClassificationContext.
import { z } from "zod";
import type { Score } from "@veritas/core";
import type { ClaimType } from "./claim-type.js";
import type { Domain } from "./domain.js";

/** Structured output of classifying a single claim */
export interface ClassificationResult {
  readonly claimText: string;
  readonly claimType: ClaimType;
  readonly domain: Domain;
  /** Confidence in the combined classification (0–1) */
  readonly confidence: Score;
  /** Confidence breakdown by dimension */
  readonly typeConfidence: Score;
  readonly domainConfidence: Score;
  /** Verifier identifiers recommended for this claim */
  readonly recommendedVerifiers: ReadonlyArray<string>;
  /** Whether the LLM-backed classifier was consulted */
  readonly llmAssisted: boolean;
}

/** A node in the hierarchical taxonomy tree */
export interface TaxonomyNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly claimType: ClaimType;
  readonly domain: Domain;
  /** Parent node id, or null for root nodes */
  readonly parentId: string | null;
  /** Child node ids */
  readonly childIds: ReadonlyArray<string>;
}

/** Mapping from a domain to the ordered list of verifier ids that handle it */
export interface VerifierMapping {
  readonly domain: Domain;
  /** Primary verifier id (highest priority) */
  readonly primaryVerifierId: string;
  /** Fallback verifier ids in priority order */
  readonly fallbackVerifierIds: ReadonlyArray<string>;
}

/** Context passed to classifiers to aid disambiguation */
export interface ClassificationContext {
  /** Optional document title for domain hints */
  readonly documentTitle?: string;
  /** Explicit domain hint overrides heuristic detection */
  readonly domainHint?: Domain;
  /** Max confidence below which LLM fallback is triggered */
  readonly llmFallbackThreshold?: Score;
}

/** Zod schema for validating classification input */
export const ClassificationInputSchema = z.object({
  claimText: z.string().min(1).max(4000),
  documentTitle: z.string().optional(),
  domainHint: z.string().optional(),
  llmFallbackThreshold: z.number().min(0).max(1).optional(),
});

export type ClassificationInput = z.infer<typeof ClassificationInputSchema>;

/** Lexical feature vector extracted from claim text */
export interface ClaimFeatures {
  readonly hasNumbers: boolean;
  readonly hasPercentage: boolean;
  readonly hasCurrency: boolean;
  readonly hasComparison: boolean;
  readonly hasCausalKeyword: boolean;
  readonly hasDefinitionKeyword: boolean;
  readonly hasPredictionKeyword: boolean;
  readonly hasQuoteMarkers: boolean;
  readonly hasEventKeyword: boolean;
  readonly hasMedicalKeyword: boolean;
  readonly hasFinancialKeyword: boolean;
  readonly hasScientificKeyword: boolean;
  readonly hasCryptoKeyword: boolean;
  readonly hasLegalKeyword: boolean;
  readonly wordCount: number;
  readonly tokenDensity: number;
}
