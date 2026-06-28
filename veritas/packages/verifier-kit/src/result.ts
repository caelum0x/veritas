// result.ts: typed result envelope returned by every specialized verifier.
import { z } from "zod";
import type { IsoTimestamp, Verdict, Score } from "@veritas/core";
import { verdictSchema, scoreSchema, isoTimestampSchema } from "@veritas/core";
import type { VerifiableClaim, ConfidenceLevel } from "./types.js";
import { ConfidenceLevelSchema } from "./types.js";

/** A single piece of evidence collected during verification. */
export const EvidenceItemSchema = z.object({
  sourceId: z.string().min(1),
  url: z.string().url().optional(),
  excerpt: z.string().optional(),
  retrievedAt: isoTimestampSchema,
  relevanceScore: scoreSchema.optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/** A verdict signal emitted by a specialized verifier. */
export const VerdictSignalSchema = z.object({
  verifierId: z.string().min(1),
  label: verdictSchema,
  score: scoreSchema,
  confidence: ConfidenceLevelSchema,
  rationale: z.string().optional(),
  evidence: z.array(EvidenceItemSchema),
});
export type VerdictSignal = z.infer<typeof VerdictSignalSchema>;

/** The full result returned by a specialized verifier. */
export const VerifierResultSchema = z.object({
  verifierId: z.string().min(1),
  claimId: z.string().min(1),
  signals: z.array(VerdictSignalSchema).min(1),
  evidence: z.array(EvidenceItemSchema),
  verdict: verdictSchema,
  score: scoreSchema,
  confidence: ConfidenceLevelSchema,
  durationMs: z.number().int().nonnegative(),
  verifiedAt: isoTimestampSchema,
  metadata: z.record(z.unknown()).optional(),
});
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

/** Constructs a VerifierResult with sensible defaults. */
export function makeVerifierResult(
  params: Omit<VerifierResult, "verifiedAt"> & { verifiedAt?: IsoTimestamp }
): VerifierResult {
  return VerifierResultSchema.parse({
    ...params,
    verifiedAt: params.verifiedAt ?? new Date().toISOString(),
  });
}

/** Derives an overall verdict from a collection of signals (majority vote weighted by score). */
export function deriveVerdict(signals: readonly VerdictSignal[]): {
  verdict: Verdict;
  score: Score;
  confidence: ConfidenceLevel;
} {
  if (signals.length === 0) {
    return { verdict: "unverifiable" as Verdict, score: 0 as Score, confidence: "very_low" };
  }

  const totalScore = signals.reduce((acc, s) => acc + s.score, 0);
  const avgScore = (totalScore / signals.length) as Score;

  const counts: Record<string, number> = {};
  for (const s of signals) {
    counts[s.label] = (counts[s.label] ?? 0) + s.score;
  }
  const verdict = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] as Verdict;

  const confidence: ConfidenceLevel =
    avgScore >= 0.85
      ? "very_high"
      : avgScore >= 0.7
        ? "high"
        : avgScore >= 0.5
          ? "medium"
          : avgScore >= 0.3
            ? "low"
            : "very_low";

  return { verdict, score: avgScore, confidence };
}
