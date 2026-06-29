import type { Citation, Verdict } from '../verify/schema.js';

export interface ClaimAdjudication {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  citations: Citation[];
}

/**
 * The verification "brain", abstracted so the engine never imports a vendor
 * SDK directly. The production implementation is Claude-backed
 * ({@link ./anthropic.ts}); tests inject a deterministic fake.
 */
export interface VerifierLLM {
  /** Decompose a block of generated text into discrete, checkable factual claims. */
  extractClaims(text: string, context?: string): Promise<string[]>;

  /**
   * Gather web evidence for a single claim and adjudicate it. Implementations
   * are expected to cite verifiable sources and default to UNVERIFIABLE when
   * evidence is insufficient — never guess.
   */
  verifyClaim(input: {
    claim: string;
    context?: string;
    allowedDomains?: string[];
  }): Promise<ClaimAdjudication>;
}
