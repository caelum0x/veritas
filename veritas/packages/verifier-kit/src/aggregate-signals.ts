// Aggregate multiple VerdictSignals into a single weighted verdict and confidence score.

import { Verdict } from "@veritas/core";
import { type VerdictSignal } from "./signal.js";

export interface AggregatedVerdict {
  readonly verdict: Verdict;
  /** Weighted mean confidence across all signals, [0, 1]. */
  readonly confidence: number;
  /** Breakdown of weight-by-verdict for diagnostics. */
  readonly weights: Readonly<Record<Verdict, number>>;
}

/**
 * Combine signals using weight × confidence voting.
 * Falls back to UNVERIFIABLE when no signals are provided.
 */
export function aggregateSignals(signals: readonly VerdictSignal[]): AggregatedVerdict {
  if (signals.length === 0) {
    return {
      verdict: Verdict.UNVERIFIABLE,
      confidence: 0,
      weights: { SUPPORTED: 0, REFUTED: 0, UNVERIFIABLE: 0 },
    };
  }

  const accumulated: Record<Verdict, number> = {
    SUPPORTED: 0,
    REFUTED: 0,
    UNVERIFIABLE: 0,
  };

  let totalWeight = 0;

  for (const signal of signals) {
    const vote = signal.weight * signal.confidence;
    accumulated[signal.verdict] += vote;
    totalWeight += signal.weight;
  }

  // Pick the verdict with the highest accumulated score.
  const verdict = (Object.keys(accumulated) as Verdict[]).reduce((best, v) =>
    accumulated[v] > accumulated[best] ? v : best
  );

  const confidence = totalWeight > 0 ? accumulated[verdict] / totalWeight : 0;

  const weights: Record<Verdict, number> =
    totalWeight > 0
      ? {
          SUPPORTED: accumulated.SUPPORTED / totalWeight,
          REFUTED: accumulated.REFUTED / totalWeight,
          UNVERIFIABLE: accumulated.UNVERIFIABLE / totalWeight,
        }
      : { SUPPORTED: 0, REFUTED: 0, UNVERIFIABLE: 0 };

  return { verdict, confidence: Math.min(1, Math.max(0, confidence)), weights };
}
