// Core LLM types: ClaimAdjudication, ResearchResult, EvidenceItem
import type { Verdict } from "@veritas/core";
import type { Score } from "@veritas/core";

/** A single piece of evidence surfaced during research */
export interface EvidenceItem {
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
  readonly stance: "supports" | "refutes" | "neutral";
  readonly relevanceScore: Score;
}

/** Result of the research phase for a single claim */
export interface ResearchResult {
  readonly claimText: string;
  readonly evidence: ReadonlyArray<EvidenceItem>;
  readonly tokensUsed: number;
  readonly modelId: string;
  readonly searchQueriesIssued: number;
}

/** Structured adjudication output from the LLM for a claim */
export interface ClaimAdjudication {
  readonly claimText: string;
  readonly verdict: Verdict;
  readonly confidence: Score;
  readonly explanation: string;
  readonly supportingEvidence: ReadonlyArray<EvidenceItem>;
  readonly contradictingEvidence: ReadonlyArray<EvidenceItem>;
  readonly tokensUsed: number;
  readonly modelId: string;
}

/** Token usage snapshot for a single LLM call */
export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

/** Cost estimate in micro-USD for a set of token usage */
export interface CostEstimate {
  readonly inputCostUsd: number;
  readonly outputCostUsd: number;
  readonly totalCostUsd: number;
}
