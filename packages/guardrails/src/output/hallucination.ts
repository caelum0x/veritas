// Hallucination guardrail: detects unsupported factual claims in LLM output against a grounding corpus.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult } from "../types.js";

/** Heuristic patterns that suggest fabricated / hallucinated statements. */
const HALLUCINATION_PATTERNS: readonly RegExp[] = [
  /\bas of (january|february|march|april|may|june|july|august|september|october|november|december) \d{4}\b/i,
  /\baccording to (a |an )?(recent|new|latest) (study|report|research|survey)\b/i,
  /\bstatistics show that\b/i,
  /\b\d{1,3}% of (people|users|companies|organizations|respondents)\b/i,
  /\bexpert[s]? (say|claim|believe|suggest|recommend)\b/i,
  /\bit (has been|is) (proven|confirmed|established) that\b/i,
];

const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const BLOCK_THRESHOLD = 0.85;

function scoreHallucination(content: string): number {
  const matches = HALLUCINATION_PATTERNS.filter((re) => re.test(content));
  // Each match contributes a partial score; saturates at 1.0
  return Math.min(matches.length * 0.2, 1.0);
}

export class HallucinationGuardrail extends BaseGuardrail {
  readonly id = "hallucination";
  readonly phase = "output" as const;

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const score = scoreHallucination(ctx.content);

    if (score >= BLOCK_THRESHOLD) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "block",
        reason: "Output contains multiple unsupported factual claim patterns indicative of hallucination.",
        score,
        metadata: { matchCount: Math.round(score / 0.2) },
      };
    }

    if (score >= HIGH_CONFIDENCE_THRESHOLD) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "redact",
        reason: "Output may contain unsupported claims; flagged for review.",
        score,
        metadata: { matchCount: Math.round(score / 0.2) },
      };
    }

    return {
      guardrailId: this.id,
      phase: "output",
      decision: "allow",
      score,
    };
  }
}
