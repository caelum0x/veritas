// Churn risk score: composite 0-1 score derived from signals, recency, and frequency
import { z } from "zod";
import { clampScore, asScore, Score } from "@veritas/core";
import { type ChurnSignal, recentSignals } from "./signal.js";

export const RiskBand = z.enum(["low", "medium", "high", "critical"]);
export type RiskBand = z.infer<typeof RiskBand>;

export const RiskScoreSchema = z.object({
  accountId: z.string(),
  score: z.number().min(0).max(1),
  band: RiskBand,
  signalCount: z.number().int().nonnegative(),
  dominantSignal: z.string().optional(),
  computedAt: z.string().datetime(),
});
export type RiskScore = z.infer<typeof RiskScoreSchema>;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Map a 0-1 score to a named risk band */
export const toBand = (score: number): RiskBand => {
  if (score >= 0.85) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "medium";
  return "low";
};

/**
 * Compute a composite churn risk score for a single account.
 * Uses exponential decay so older signals contribute less.
 */
export const computeRiskScore = (
  accountId: string,
  signals: readonly ChurnSignal[],
): RiskScore => {
  const relevant = recentSignals(signals.filter((s) => s.accountId === accountId), THIRTY_DAYS_MS);

  if (relevant.length === 0) {
    return {
      accountId,
      score: 0,
      band: "low",
      signalCount: 0,
      computedAt: new Date().toISOString(),
    };
  }

  const now = Date.now();
  let weightedSum = 0;
  let totalDecayed = 0;
  const kindWeights = new Map<string, number>();

  for (const sig of relevant) {
    const ageMs = now - new Date(sig.occurredAt).getTime();
    const decayFactor = Math.exp(-ageMs / (7 * 24 * 60 * 60 * 1000)); // 7-day half-life
    const contribution = sig.weight * decayFactor;
    weightedSum += contribution;
    totalDecayed += decayFactor;
    kindWeights.set(sig.kind, (kindWeights.get(sig.kind) ?? 0) + contribution);
  }

  const rawScore = totalDecayed > 0 ? weightedSum / Math.max(totalDecayed, 1) : 0;
  // Dampen to 0-1 using logistic to avoid saturation from many weak signals
  const logistic = 1 / (1 + Math.exp(-6 * (rawScore - 0.5)));
  const score = clampScore(asScore(logistic));

  let dominantSignal: string | undefined;
  let maxW = 0;
  for (const [kind, w] of kindWeights) {
    if (w > maxW) { maxW = w; dominantSignal = kind; }
  }

  return {
    accountId,
    score,
    band: toBand(score),
    signalCount: relevant.length,
    dominantSignal,
    computedAt: new Date().toISOString(),
  };
};

/** Batch-compute risk scores for multiple accounts */
export const batchRiskScores = (
  accountIds: readonly string[],
  allSignals: readonly ChurnSignal[],
): RiskScore[] =>
  accountIds.map((id) => computeRiskScore(id, allSignals));
