// Contradiction severity scoring: combines NLI confidence, cluster size, and source diversity.
import { clampScore, asScore } from "@veritas/core";
import type { Score } from "@veritas/core";
import type { ClaimPair } from "./pair.js";
import type { ContradictionCluster } from "./cluster.js";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface ContradictionScore {
  /** Overall severity score in [0,1] */
  readonly score: Score;
  readonly level: SeverityLevel;
  /** Number of contradicting pairs driving the score */
  readonly pairCount: number;
  /** Mean NLI confidence across contradicting pairs */
  readonly meanConfidence: number;
  /** Number of distinct source IDs involved */
  readonly sourceCount: number;
}

function severityLevel(score: number): SeverityLevel {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

/** Score a single contradicting claim pair */
export function scorePair(pair: ClaimPair): ContradictionScore {
  const confidence = pair.nliScore?.confidence ?? 0;
  const sources = new Set<string>();
  if (pair.premise.sourceId) sources.add(pair.premise.sourceId);
  if (pair.hypothesis.sourceId) sources.add(pair.hypothesis.sourceId);
  const sourceBonus = sources.size > 1 ? 0.1 : 0;
  const raw = clampScore(confidence + sourceBonus);
  return {
    score: raw,
    level: severityLevel(raw),
    pairCount: 1,
    meanConfidence: confidence,
    sourceCount: sources.size,
  };
}

/** Score an entire contradiction cluster */
export function scoreCluster(cluster: ContradictionCluster): ContradictionScore {
  const pairs = cluster.pairs;
  if (pairs.length === 0) {
    return {
      score: asScore(0),
      level: "low",
      pairCount: 0,
      meanConfidence: 0,
      sourceCount: 0,
    };
  }

  const confidences = pairs.map((p) => p.nliScore?.confidence ?? 0);
  const meanConfidence =
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

  const sources = new Set<string>();
  for (const p of pairs) {
    if (p.premise.sourceId) sources.add(p.premise.sourceId);
    if (p.hypothesis.sourceId) sources.add(p.hypothesis.sourceId);
  }

  // Scale: confidence baseline + pair count bonus (max +0.2) + source diversity bonus (max +0.1)
  const pairBonus = Math.min(0.2, (pairs.length - 1) * 0.05);
  const sourceBonus = Math.min(0.1, (sources.size - 1) * 0.025);
  const raw = clampScore(meanConfidence + pairBonus + sourceBonus);

  return {
    score: raw,
    level: severityLevel(raw),
    pairCount: pairs.length,
    meanConfidence,
    sourceCount: sources.size,
  };
}

/** Compare two contradiction scores; returns positive if a is more severe */
export function compareSeverity(
  a: ContradictionScore,
  b: ContradictionScore,
): number {
  return a.score - b.score;
}
