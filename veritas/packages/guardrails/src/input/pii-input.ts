// PII detection guardrail: redacts personally identifiable information from inputs.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult, GuardrailPhase } from "../types.js";

interface PiiPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}

const PII_PATTERNS: readonly PiiPattern[] = [
  {
    name: "email",
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[EMAIL]",
  },
  {
    name: "phone-us",
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    replacement: "[PHONE]",
  },
  {
    name: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN]",
  },
  {
    name: "credit-card",
    pattern: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: "[CARD]",
  },
  {
    name: "ipv4",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: "[IP]",
  },
  {
    name: "date-of-birth",
    pattern: /\bDOB\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
    replacement: "[DOB]",
  },
];

function redactPii(content: string): { redacted: string; detected: string[] } {
  const detected: string[] = [];
  let redacted = content;

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const resetPattern = new RegExp(pattern.source, pattern.flags);
    const before = redacted;
    redacted = redacted.replace(resetPattern, replacement);
    if (redacted !== before) {
      detected.push(name);
    }
  }

  return { redacted, detected };
}

export class PiiInputGuardrail extends BaseGuardrail {
  readonly id = "input.pii";
  readonly phase: GuardrailPhase = "input";

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const { redacted, detected } = redactPii(ctx.content);
    const hasPii = detected.length > 0;

    return {
      guardrailId: this.id,
      phase: this.phase,
      decision: hasPii ? "redact" : "allow",
      score: hasPii ? Math.min(detected.length / PII_PATTERNS.length, 1) : 0,
      reason: hasPii ? `PII detected: ${detected.join(", ")}` : undefined,
      redactedContent: hasPii ? redacted : undefined,
      metadata: { detectedTypes: detected },
    };
  }
}
