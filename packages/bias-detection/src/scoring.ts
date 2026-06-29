// Aggregates individual bias signals into a composite BiasScore.
import type { BiasFlag } from "./flags.js";

export interface BiasScore {
  /** Composite bias score 0-1; higher means more biased. */
  readonly overall: number;
  /** Per-type breakdown of bias intensity. */
  readonly byType: Readonly<Partial<Record<BiasFlag["type"], number>>>;
  /** Confidence in the overall score based on signal coverage. */
  readonly confidence: number;
}

const SEVERITY_WEIGHTS: Record<BiasFlag["severity"], number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
};

/**
 * Compute per-type maximum bias score from a set of flags.
 * We use the max (not mean) within each type to avoid dilution from many low signals.
 */
function scoreByType(
  flags: ReadonlyArray<BiasFlag>,
): Partial<Record<BiasFlag["type"], number>> {
  const accumulator: Partial<Record<BiasFlag["type"], number>> = {};
  for (const flag of flags) {
    const weight = SEVERITY_WEIGHTS[flag.severity] * flag.confidence;
    const prev = accumulator[flag.type] ?? 0;
    if (weight > prev) {
      accumulator[flag.type] = weight;
    }
  }
  return accumulator;
}

/**
 * Compute an overall bias score as the weighted mean of per-type scores,
 * boosted by the count of distinct types that triggered.
 */
export function computeBiasScore(
  flags: ReadonlyArray<BiasFlag>,
  subjectivityScore: number,
  framingBias: number,
): BiasScore {
  const byType = scoreByType(flags);

  const typeScores = Object.values(byType) as number[];
  const typeCount = typeScores.length;

  if (typeCount === 0 && subjectivityScore < 0.3 && framingBias < 0.2) {
    return { overall: 0, byType: {}, confidence: 0.5 };
  }

  // Merge subjectivity and framing as additional signals
  const allSignals: number[] = [
    ...typeScores,
    subjectivityScore,
    framingBias,
  ];

  const mean = allSignals.reduce((s, v) => s + v, 0) / allSignals.length;

  // Diversity bonus: more types = stronger overall bias indication
  const diversityFactor = Math.min(1, 0.7 + typeCount * 0.05);
  const overall = Math.min(1, mean * diversityFactor);

  // Confidence grows with flag count up to a ceiling
  const confidence = Math.min(0.95, 0.4 + flags.length * 0.06);

  return { overall, byType, confidence };
}

/** Classify an overall bias score into a human-readable tier. */
export function scoreToBiasTier(overall: number): "minimal" | "low" | "moderate" | "high" | "extreme" {
  if (overall < 0.1) return "minimal";
  if (overall < 0.3) return "low";
  if (overall < 0.55) return "moderate";
  if (overall < 0.8) return "high";
  return "extreme";
}
