// VerifierLLM provider interface: extractClaims, research, adjudicate
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { ClaimAdjudication, ResearchResult, EvidenceItem } from "./types.js";

/** Options controlling a single LLM verification pass */
export interface VerificationCallOptions {
  /** Override the default model for this call */
  readonly modelId?: string;
  /** Maximum tokens the model may generate */
  readonly maxOutputTokens?: number;
  /** Whether to enable web search tool during research */
  readonly enableWebSearch?: boolean;
  /** Abort signal for cooperative cancellation */
  readonly signal?: AbortSignal;
}

/** Options for claim extraction */
export interface ExtractClaimsOptions extends VerificationCallOptions {
  /** Maximum number of claims to extract */
  readonly maxClaims?: number;
}

/** Options for the research phase */
export interface ResearchOptions extends VerificationCallOptions {
  /** Maximum number of web search queries to issue */
  readonly maxSearchQueries?: number;
}

/** Options for the adjudication phase */
export interface AdjudicateOptions extends VerificationCallOptions {
  /** Pre-fetched research result to anchor adjudication */
  readonly researchResult?: ResearchResult;
}

/** A discrete factual claim extracted from a document */
export interface ExtractedClaim {
  readonly text: string;
  readonly startOffset: number | null;
  readonly endOffset: number | null;
  readonly checkworthiness: number; // 0-1
}

/** Result of claim extraction */
export interface ExtractionResult {
  readonly claims: ReadonlyArray<ExtractedClaim>;
  readonly tokensUsed: number;
  readonly modelId: string;
}

/**
 * Core provider abstraction every LLM backend must satisfy.
 * All methods are pure async and return Result to allow typed error handling.
 */
export interface VerifierLLM {
  /** Unique provider name (e.g. "anthropic", "mock") */
  readonly name: string;

  /**
   * Extract discrete factual claims from raw document text.
   */
  extractClaims(
    documentText: string,
    options?: ExtractClaimsOptions,
  ): Promise<Result<ExtractionResult, AppError>>;

  /**
   * Phase 1: research a single claim via web search + retrieval.
   */
  research(
    claimText: string,
    options?: ResearchOptions,
  ): Promise<Result<ResearchResult, AppError>>;

  /**
   * Phase 2: adjudicate a claim given prior research, producing a verdict + confidence.
   */
  adjudicate(
    claimText: string,
    options?: AdjudicateOptions,
  ): Promise<Result<ClaimAdjudication, AppError>>;
}
