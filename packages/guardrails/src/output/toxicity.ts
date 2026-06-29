// Toxicity guardrail: detects harmful, offensive, or abusive language in LLM output.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult } from "../types.js";

/** Severity tiers for pattern-based toxicity scoring. */
const HIGH_SEVERITY_PATTERNS: readonly RegExp[] = [
  /\b(kill|murder|rape|torture|genocide)\b/i,
  /\b(n[i1]gg[ae]r|f[a4]gg[o0]t|ch[i1]nk|sp[i1][ck]|k[i1]ke|w[e3]tb[a4]ck)\b/i,
  /\b(bomb|explosive|poison)\s+(recipe|instructions?|how[\s-]to|formula)\b/i,
];

const MEDIUM_SEVERITY_PATTERNS: readonly RegExp[][] = [
  [/\b(hate|despise|loathe)\s+(all\s+)?(jews?|muslims?|christians?|blacks?|whites?|asians?|hispanics?)\b/i],
  [/\b(you|they|he|she)\s+(are|is|should be)\s+(a\s+)?(idiot|moron|stupid|retard|worthless|garbage|trash)\b/i],
  [/\bgo\s+(kill|hurt|harm)\s+yourself\b/i],
];

function scoreContent(content: string): { score: number; tier: "high" | "medium" | "none" } {
  for (const pattern of HIGH_SEVERITY_PATTERNS) {
    if (pattern.test(content)) return { score: 0.95, tier: "high" };
  }
  let mediumHits = 0;
  for (const group of MEDIUM_SEVERITY_PATTERNS) {
    const pattern = group[0];
    if (pattern !== undefined && pattern.test(content)) mediumHits++;
  }
  if (mediumHits > 0) {
    return { score: Math.min(0.4 + mediumHits * 0.15, 0.74), tier: "medium" };
  }
  return { score: 0.0, tier: "none" };
}

export class ToxicityGuardrail extends BaseGuardrail {
  readonly id = "toxicity";
  readonly phase = "output" as const;

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const { score, tier } = scoreContent(ctx.content);

    if (tier === "high") {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "block",
        reason: "Output contains high-severity toxic content.",
        score,
        metadata: { tier },
      };
    }

    if (tier === "medium") {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "redact",
        reason: "Output contains potentially harmful language.",
        score,
        metadata: { tier },
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
