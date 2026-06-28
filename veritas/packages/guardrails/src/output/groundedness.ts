// Groundedness guardrail: checks that key claims in output are traceable to provided source passages.
import { BaseGuardrail } from "../guardrail.js";
import type { GuardrailContext, GuardrailResult } from "../types.js";

/** Minimum token overlap ratio to consider a sentence grounded. */
const OVERLAP_THRESHOLD = 0.35;
/** Block when proportion of ungrounded sentences exceeds this. */
const BLOCK_RATIO = 0.7;
/** Redact when proportion of ungrounded sentences exceeds this. */
const REDACT_RATIO = 0.4;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function splitSentences(text: string): readonly string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

export class GroundednessGuardrail extends BaseGuardrail {
  readonly id = "groundedness";
  readonly phase = "output" as const;

  protected async evaluate(ctx: GuardrailContext): Promise<GuardrailResult> {
    const passages = ctx.metadata?.["groundingPassages"];

    // If no grounding passages provided, skip check and allow.
    if (!Array.isArray(passages) || passages.length === 0) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "allow",
        score: 0.0,
        metadata: { skipped: true, reason: "No grounding passages supplied." },
      };
    }

    const passageTokens = (passages as unknown[])
      .filter((p): p is string => typeof p === "string")
      .map(tokenize);

    const sentences = splitSentences(ctx.content);
    if (sentences.length === 0) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "allow",
        score: 0.0,
      };
    }

    let ungrounded = 0;
    for (const sentence of sentences) {
      const sentTokens = tokenize(sentence);
      const maxOverlap = passageTokens.reduce(
        (best, pt) => Math.max(best, jaccardOverlap(sentTokens, pt)),
        0,
      );
      if (maxOverlap < OVERLAP_THRESHOLD) ungrounded++;
    }

    const ungroundedRatio = ungrounded / sentences.length;
    const score = ungroundedRatio;

    if (ungroundedRatio >= BLOCK_RATIO) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "block",
        reason: `${Math.round(ungroundedRatio * 100)}% of output sentences are not grounded in provided sources.`,
        score,
        metadata: { totalSentences: sentences.length, ungroundedSentences: ungrounded },
      };
    }

    if (ungroundedRatio >= REDACT_RATIO) {
      return {
        guardrailId: this.id,
        phase: "output",
        decision: "redact",
        reason: `${Math.round(ungroundedRatio * 100)}% of output sentences may not be grounded in provided sources.`,
        score,
        metadata: { totalSentences: sentences.length, ungroundedSentences: ungrounded },
      };
    }

    return {
      guardrailId: this.id,
      phase: "output",
      decision: "allow",
      score,
      metadata: { totalSentences: sentences.length, ungroundedSentences: ungrounded },
    };
  }
}
