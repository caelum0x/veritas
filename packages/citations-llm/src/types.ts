// Shared types for citations-llm package.

import { z } from "zod";
import type { CitationSpan } from "./span.js";

/** A citation produced or consumed by LLM-based pipelines. */
export const LlmCitationSchema = z.object({
  /** Unique citation identifier (nanoid). */
  id: z.string(),
  /** Claim or sentence this citation supports. */
  claimId: z.string(),
  /** The span from the source document. */
  span: z.object({
    sourceId: z.string(),
    url: z.string().url(),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    text: z.string(),
    section: z.string().optional(),
  }),
  /** Raw quote verbatim from the source (may equal span.text). */
  quote: z.string(),
  /** Confidence score [0, 1] that this citation supports the claim. */
  confidence: z.number().min(0).max(1),
  /** Formatted reference string (e.g. APA, MLA). */
  formatted: z.string().optional(),
  /** Content hash of span.text for deduplication. */
  contentHash: z.string().optional(),
  /** ISO-8601 timestamp when the citation was created. */
  createdAt: z.string(),
});

export type LlmCitation = z.infer<typeof LlmCitationSchema>;

/** Lightweight reference to a citation source. */
export interface SourceRef {
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly publishedAt?: string;
}

/** Result of a deduplication pass. */
export interface DedupeResult {
  readonly unique: readonly LlmCitation[];
  readonly duplicates: readonly LlmCitation[];
}

/** Result of a validation pass. */
export interface ValidationResult {
  readonly valid: readonly LlmCitation[];
  readonly invalid: ReadonlyArray<{ citation: LlmCitation; reason: string }>;
}

/** Options for citation extraction. */
export interface ExtractionOptions {
  /** Minimum confidence threshold to include a citation. */
  readonly minConfidence?: number;
  /** Maximum number of citations to return. */
  readonly maxCitations?: number;
}

/** Options for deduplication. */
export interface DedupeOptions {
  /** Whether to prefer higher-confidence citations when deduping. */
  readonly preferHighConfidence?: boolean;
}
