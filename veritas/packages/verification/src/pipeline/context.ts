// Verification run context: typed state record threaded through all pipeline stages.

import type { VerificationId, ClaimId, Score, Logger } from "@veritas/core";
import type { Verdict } from "@veritas/core";
import type { VerifierLLM, ResearchResult, ClaimAdjudication } from "@veritas/llm";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import type { EngineOptions } from "../engine-options.js";

/** A normalized, deduplicated claim ready for research and adjudication. */
export interface PipelineClaim {
  readonly id: ClaimId;
  readonly text: string;
  readonly normalized: string;
  readonly order: number;
}

/** A citation collapsed from evidence items for the final report. */
export interface PipelineCitation {
  readonly url: string;
  readonly title: string | null;
  readonly quote: string | null;
  readonly supports: boolean;
}

/** Adjudicated result for a single pipeline claim. */
export interface AdjudicatedClaim {
  readonly claim: PipelineClaim;
  readonly verdict: Verdict;
  readonly confidence: Score;
  readonly reasoning: string;
  readonly citations: ReadonlyArray<PipelineCitation>;
  readonly tokensUsed: number;
}

/**
 * The full context threaded through every verification stage.
 * Immutable fields (readonly) must not be reassigned after construction.
 * Mutable fields are updated in-place by stages during the pipeline run.
 */
export interface VerificationContext {
  /** Unique run id for this verification attempt. */
  readonly verificationId: VerificationId;
  /** ISO timestamp at which the run was initiated. */
  readonly startedAt: string;
  /** Validated caller request. */
  readonly request: Readonly<VerificationRequest>;
  /** Engine-level options (concurrency, model overrides, domain filters…). */
  readonly options: Readonly<EngineOptions>;
  /** LLM provider instance to use for all AI calls. */
  readonly llm: VerifierLLM;
  /** Convenience logger so stages don't need to dereference options. */
  readonly logger: Logger;
  /** Raw input text submitted for verification. */
  readonly inputText: string;
  /** Normalized, cleaned input text (populated by normalize stage). */
  normalizedText: string;
  /** Claims after extraction and de-duplication. */
  claims: ReadonlyArray<PipelineClaim>;
  /** Research results keyed by ClaimId. */
  research: ReadonlyMap<ClaimId, ResearchResult>;
  /** Raw adjudication outputs keyed by ClaimId. */
  adjudications: ReadonlyMap<ClaimId, ClaimAdjudication>;
  /** Final adjudicated claim rows (populated by adjudicate stage). */
  adjudicatedClaims: ReadonlyArray<AdjudicatedClaim>;
  /** Aggregate trust score computed by the score stage (set by score stage). */
  trustScore: Score | null;
  /** Fully assembled public report (populated by assemble stage). */
  report: VerificationReport | null;
  /** Accumulated total tokens across all LLM calls in this run. */
  totalTokensUsed: number;
}

/** Return a new context with selected fields overridden (shallow spread). */
export function patchContext(
  ctx: VerificationContext,
  patch: Partial<VerificationContext>,
): VerificationContext {
  return { ...ctx, ...patch };
}
