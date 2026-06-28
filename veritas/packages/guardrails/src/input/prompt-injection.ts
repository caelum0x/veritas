// Prompt-injection detection guardrail: blocks inputs that attempt to override system instructions.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult, GuardrailPhase } from "../types.js";

/** Heuristic patterns indicative of prompt injection attempts. */
const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /you\s+are\s+now\s+(a\s+)?(?!veritas|fact)/i,
  /new\s+system\s+prompt\s*:/i,
  /\[system\]\s*:/i,
  /<\s*system\s*>/i,
  /act\s+as\s+(an?\s+)?(?!assistant|veritas|fact.?check)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(?!a\s+fact)/i,
  /override\s+(your\s+)?instructions?/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /DAN\s+mode/i,
];

const INJECTION_SCORE_THRESHOLD = 0.5;

function scoreContent(content: string): number {
  const matches = INJECTION_PATTERNS.filter((p) => p.test(content)).length;
  return Math.min(matches / 3, 1); // normalise: 3+ matches → score 1.0
}

export class PromptInjectionGuardrail extends BaseGuardrail {
  readonly id = "input.prompt-injection";
  readonly phase: GuardrailPhase = "input";

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const score = scoreContent(ctx.content);
    const detected = score >= INJECTION_SCORE_THRESHOLD;

    return {
      guardrailId: this.id,
      phase: this.phase,
      decision: detected ? "block" : "allow",
      score,
      reason: detected ? "Prompt injection attempt detected" : undefined,
      metadata: { patternScore: score },
    };
  }
}
