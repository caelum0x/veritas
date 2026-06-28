// Jailbreak detection guardrail: blocks inputs designed to bypass safety constraints.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult, GuardrailPhase } from "../types.js";

/** Patterns commonly used in jailbreak attempts. */
const JAILBREAK_PATTERNS: readonly RegExp[] = [
  /developer\s+mode/i,
  /training\s+mode/i,
  /sudo\s+mode/i,
  /god\s+mode/i,
  /unrestricted\s+mode/i,
  /no\s+restrictions?/i,
  /bypass\s+(your\s+)?(safety|filter|content|restriction)/i,
  /without\s+(any\s+)?(ethical\s+)?(restriction|limitation|constraint|filter)/i,
  /enable\s+(unrestricted|uncensored|unfiltered)\s+mode/i,
  /stay\s+in\s+character\s+no\s+matter/i,
  /respond\s+without\s+(any\s+)?(moral|ethical|safety)/i,
  /\bDAN\b/,
  /\bAIM\b.*harmful/i,
  /simulate\s+(a\s+)?scenario\s+where\s+(you\s+)?can/i,
  /hypothetically\s+(speaking\s+)?if\s+you\s+(had\s+no|were\s+allowed)/i,
];

const JAILBREAK_THRESHOLD = 0.4;

function scoreContent(content: string): number {
  const matches = JAILBREAK_PATTERNS.filter((p) => p.test(content)).length;
  return Math.min(matches / 2, 1); // 2+ matches → score 1.0
}

export class JailbreakGuardrail extends BaseGuardrail {
  readonly id = "input.jailbreak";
  readonly phase: GuardrailPhase = "input";

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const score = scoreContent(ctx.content);
    const detected = score >= JAILBREAK_THRESHOLD;

    return {
      guardrailId: this.id,
      phase: this.phase,
      decision: detected ? "block" : "allow",
      score,
      reason: detected ? "Jailbreak attempt detected" : undefined,
      metadata: { patternScore: score },
    };
  }
}
