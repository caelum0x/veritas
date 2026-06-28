// Crypto confidence scoring: aggregates rule results into a [0,1] confidence score and verdict.

import { clampScore, type Verdict } from "@veritas/core";
import type { RuleResult, RuleOutcome } from "./rules.js";

/** Numeric weight per outcome used in weighted mean. */
const OUTCOME_SCORE: Record<RuleOutcome, number> = {
  pass: 1.0,
  warn: 0.5,
  fail: 0.0,
};

/** Weighted aggregate of rule results in [0, 1]. */
export interface ScoringResult {
  readonly score: number;
  readonly verdict: Verdict;
  readonly confidence: number;
  readonly passCount: number;
  readonly warnCount: number;
  readonly failCount: number;
  readonly totalWeight: number;
}

/**
 * Aggregate rule results into a confidence score.
 * Each rule contributes its outcome score multiplied by its weight.
 * Returns a ScoringResult with a suggested Verdict.
 */
export function aggregateRuleResults(results: ReadonlyArray<RuleResult>): ScoringResult {
  if (results.length === 0) {
    return {
      score: 0.5,
      verdict: "UNVERIFIABLE" as const,
      confidence: 0,
      passCount: 0,
      warnCount: 0,
      failCount: 0,
      totalWeight: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const r of results) {
    weightedSum += OUTCOME_SCORE[r.outcome] * r.weight;
    totalWeight += r.weight;
    if (r.outcome === "pass") passCount++;
    else if (r.outcome === "warn") warnCount++;
    else failCount++;
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  const score = clampScore(rawScore);

  // Confidence scales with total weight (saturates around weight sum of 3).
  const confidence = clampScore(Math.min(totalWeight / 3, 1));

  const verdict = deriveVerdict(score, failCount, results.length);

  return { score, verdict, confidence, passCount, warnCount, failCount, totalWeight };
}

/** Map a score + fail-count to a Verdict label. */
function deriveVerdict(score: number, failCount: number, total: number): Verdict {
  // Any hard-fail rules cause at least a refuted verdict.
  if (failCount > 0 && failCount / total >= 0.5) return "REFUTED";
  if (failCount > 0) return "UNVERIFIABLE";
  if (score >= 0.8) return "SUPPORTED";
  if (score >= 0.6) return "SUPPORTED";
  if (score >= 0.4) return "UNVERIFIABLE";
  if (score >= 0.2) return "REFUTED";
  return "REFUTED";
}

/**
 * Blend a rule-based score with an optional LLM-derived confidence.
 * LLM weight defaults to 0.3; rules weight to 0.7.
 */
export function blendScores(
  ruleScore: number,
  llmScore: number | null,
  llmWeight: number = 0.3
): number {
  if (llmScore === null) return clampScore(ruleScore);
  const ruleWeight = 1 - llmWeight;
  return clampScore(ruleScore * ruleWeight + llmScore * llmWeight);
}
