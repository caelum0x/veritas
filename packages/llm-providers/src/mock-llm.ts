// Deterministic mock VerifierLLM for llm-providers package — no external calls, testable by default
import { ok, type Result, asScore, clampScore } from "@veritas/core";
import type { AppError } from "@veritas/core";
import { Verdict } from "@veritas/core";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
  ExtractedClaim,
} from "@veritas/llm";
import type { ResearchResult, ClaimAdjudication, EvidenceItem } from "@veritas/llm";

const MOCK_MODEL_ID = "mock-llm-providers-v1";

function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return (h % 100) / 100;
}

function toVerdict(score: number): Verdict {
  if (score >= 0.75) return Verdict.SUPPORTED;
  if (score >= 0.4) return Verdict.UNVERIFIABLE;
  return Verdict.REFUTED;
}

function buildEvidence(claimText: string, stance: EvidenceItem["stance"]): EvidenceItem {
  return {
    url: `https://mock-llm-providers.example/ref?q=${encodeURIComponent(claimText.slice(0, 24))}`,
    title: `Mock [${stance}] — ${claimText.slice(0, 40)}`,
    snippet: `Synthetic evidence that ${stance} the claim: "${claimText.slice(0, 60)}"`,
    publishedAt: "2025-06-01T00:00:00Z",
    stance,
    relevanceScore: asScore(clampScore(stableHash(claimText + stance))),
  };
}

/** Configurable mock suitable for both dev and golden-file tests in llm-providers. */
export class MockLLM implements VerifierLLM {
  readonly name: string;

  constructor(name = "mock-llm-providers") {
    this.name = name;
  }

  async extractClaims(
    documentText: string,
    options?: ExtractClaimsOptions,
  ): Promise<Result<ExtractionResult, AppError>> {
    const maxClaims = options?.maxClaims ?? 3;
    const sentences = documentText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, maxClaims);

    const claims: ExtractedClaim[] = sentences.map((text, idx) => ({
      text,
      startOffset: idx * 90,
      endOffset: idx * 90 + text.length,
      checkworthiness: clampScore(stableHash(text)),
    }));

    return ok({
      claims,
      tokensUsed: Math.ceil(documentText.length / 4),
      modelId: MOCK_MODEL_ID,
    });
  }

  async research(
    claimText: string,
    options?: ResearchOptions,
  ): Promise<Result<ResearchResult, AppError>> {
    const maxQueries = options?.maxSearchQueries ?? 2;
    const score = stableHash(claimText);
    const primaryStance: EvidenceItem["stance"] = score >= 0.5 ? "supports" : "refutes";

    const evidence: EvidenceItem[] = [
      buildEvidence(claimText, primaryStance),
      buildEvidence(claimText + "-ctx", "neutral"),
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
    const score = stableHash(claimText);
    const confidence = asScore(clampScore(0.5 + score * 0.4));
    const verdict = toVerdict(score);

    return ok({
      claimText,
      verdict,
      confidence,
      explanation: `MockLLM: claim scored ${(score * 100).toFixed(1)}% → verdict="${verdict}".`,
      supportingEvidence: [buildEvidence(claimText, "supports")],
      contradictingEvidence: [buildEvidence(claimText, "refutes")],
      tokensUsed: (prior?.tokensUsed ?? 0) + claimText.length * 3,
      modelId: MOCK_MODEL_ID,
    });
  }
}
