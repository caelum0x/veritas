// contradiction-free gate: detects claims within the same report that assert opposing verdicts on the same topic.

import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import { passed, failed } from "../result.js";
import type { GateResult, GateFinding } from "../result.js";
import type { Severity } from "../severity.js";
import { z } from "zod";

const GATE_ID = "contradiction-free";

const claimShape = z.object({
  claim: z.string(),
  verdict: z.string(),
  confidence: z.number().min(0).max(1),
});

const reportShape = z.object({
  claims: z.array(z.unknown()),
});

/** Stop-words removed before building a normalised key for comparison. */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "has", "have", "had",
  "not", "no", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by",
]);

/** Produce a bag-of-content-words key from a claim string. */
function claimKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .sort()
    .join(" ");
}

/** Jaccard similarity between two keyword sets (0 = disjoint, 1 = identical). */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const term of a) {
    if (b.has(term)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Verdicts considered opposing to each other. */
function areOpposingVerdicts(v1: string, v2: string): boolean {
  return (
    (v1 === "supported" && v2 === "refuted") ||
    (v1 === "refuted" && v2 === "supported")
  );
}

export function createContradictionFreeGate(options: {
  /** Jaccard similarity threshold above which two claims are considered about the same topic (default: 0.35). */
  similarityThreshold?: number;
  failOn?: Severity;
} = {}): QualityGate {
  const similarityThreshold = options.similarityThreshold ?? 0.35;

  return {
    id: GATE_ID,
    name: "Contradiction Free",
    failOn: options.failOn ?? "error",

    async evaluate(input: GateInput): Promise<Result<GateResult>> {
      const reportParsed = reportShape.safeParse(input.report);
      if (!reportParsed.success) {
        return ok(failed(GATE_ID, [
          {
            code: "contradiction-free.invalid-report",
            message: "Report does not contain a parseable claims array.",
            severity: "error",
          },
        ]));
      }

      // Parse claims and build keyword sets.
      type ParsedClaim = {
        index: number;
        text: string;
        verdict: string;
        keywords: Set<string>;
      };

      const parsedClaims: ParsedClaim[] = [];
      for (let i = 0; i < reportParsed.data.claims.length; i++) {
        const parsed = claimShape.safeParse(reportParsed.data.claims[i]);
        if (!parsed.success) continue;
        const keywords = new Set(claimKey(parsed.data.claim).split(" ").filter(Boolean));
        parsedClaims.push({
          index: i,
          text: parsed.data.claim,
          verdict: parsed.data.verdict,
          keywords,
        });
      }

      const findings: GateFinding[] = [];

      // O(n²) pairwise check — acceptable for typical claim counts (<50).
      for (let i = 0; i < parsedClaims.length; i++) {
        for (let j = i + 1; j < parsedClaims.length; j++) {
          const a = parsedClaims[i];
          const b = parsedClaims[j];

          if (a === undefined || b === undefined) continue;
          if (!areOpposingVerdicts(a.verdict, b.verdict)) continue;

          const similarity = jaccardSimilarity(a.keywords, b.keywords);
          if (similarity >= similarityThreshold) {
            findings.push({
              code: "contradiction-free.opposing-verdicts",
              message:
                `Claims [${a.index}] and [${b.index}] appear to address the same topic ` +
                `(similarity ${similarity.toFixed(2)}) but carry opposing verdicts ` +
                `("${a.verdict}" vs "${b.verdict}"). ` +
                `"${a.text.slice(0, 60)}" ↔ "${b.text.slice(0, 60)}"`,
              severity: "error",
              path: `claims[${a.index}] ↔ claims[${b.index}]`,
            });
          }
        }
      }

      const contradictionRate =
        parsedClaims.length > 1
          ? findings.length / (parsedClaims.length * (parsedClaims.length - 1) / 2)
          : 0;

      if (findings.length === 0) {
        return ok(passed(GATE_ID, contradictionRate));
      }
      return ok(failed(GATE_ID, findings, contradictionRate));
    },
  };
}
