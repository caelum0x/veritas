// Deterministic mock VerifierLLM for local/dev/test use — no external calls
import { ok, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import { Verdict, asScore, clampScore } from "@veritas/core";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
  ExtractedClaim,
} from "./provider.js";
import type { ResearchResult, ClaimAdjudication, EvidenceItem } from "./types.js";

const MOCK_MODEL_ID = "mock-v1";

/** Stable hash of a string to a number in [0, 1] */
function stableScore(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return (h % 100) / 100;
}

function deriveVerdict(score: number): Verdict {
  if (score >= 0.75) return Verdict.SUPPORTED;
  if (score >= 0.4) return Verdict.UNVERIFIABLE;
  return Verdict.REFUTED;
}

function mockEvidence(claimText: string, stance: EvidenceItem["stance"]): EvidenceItem {
  return {
    url: `https://mock-source.example/article?q=${encodeURIComponent(claimText.slice(0, 30))}`,
    title: `Mock ${stance} source for: ${claimText.slice(0, 40)}`,
    snippet: `This is a mock evidence snippet that ${stance} the claim "${claimText.slice(0, 60)}".`,
    publishedAt: "2025-01-01T00:00:00Z",
    stance,
    relevanceScore: asScore(clampScore(stableScore(claimText + stance))),
  };
}

/**
 * MockProvider returns deterministic results driven solely by the input text.
 * Identical inputs always produce identical outputs — suitable for golden tests.
 */
export class MockProvider implements VerifierLLM {
  readonly name = "mock";

  async extractClaims(
    documentText: string,
    options?: ExtractClaimsOptions,
  ): Promise<Result<ExtractionResult, AppError>> {
    const maxClaims = options?.maxClaims ?? 3;
    // Split on sentence boundaries, take up to maxClaims
    const sentences = documentText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, maxClaims);

    const claims: ExtractedClaim[] = sentences.map((text, i) => ({
      text,
      startOffset: i * 80,
      endOffset: i * 80 + text.length,
      checkworthiness: clampScore(stableScore(text)),
    }));

    return ok({
      claims,
      tokensUsed: documentText.length / 4,
      modelId: MOCK_MODEL_ID,
    });
  }

  async research(
    claimText: string,
    options?: ResearchOptions,
  ): Promise<Result<ResearchResult, AppError>> {
    const maxQueries = options?.maxSearchQueries ?? 2;
    const score = stableScore(claimText);

    const evidence: EvidenceItem[] = [
      mockEvidence(claimText, score >= 0.5 ? "supports" : "refutes"),
      mockEvidence(claimText + "-2", "neutral"),
    ];

    return ok({
      claimText,
      evidence,
      tokensUsed: claimText.length * 2,
      modelId: MOCK_MODEL_ID,
      searchQueriesIssued: Math.min(maxQueries, 2),
    });
  }

  async adjudicate(
    claimText: string,
    options?: AdjudicateOptions,
  ): Promise<Result<ClaimAdjudication, AppError>> {
    const prior = options?.researchResult;
    const baseScore = stableScore(claimText);
    const confidence = asScore(clampScore(0.5 + baseScore * 0.4));
    const verdict = deriveVerdict(baseScore);

    const supporting: EvidenceItem[] = [mockEvidence(claimText, "supports")];
    const contradicting: EvidenceItem[] = [mockEvidence(claimText, "refutes")];

    const totalTokens = (prior?.tokensUsed ?? 0) + claimText.length * 3;

    return ok({
      claimText,
      verdict,
      confidence,
      explanation: `Mock adjudication: the claim scores ${(baseScore * 100).toFixed(1)}% on internal heuristics, yielding verdict "${verdict}".`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting,
      tokensUsed: totalTokens,
      modelId: MOCK_MODEL_ID,
    });
  }
}
