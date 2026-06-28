// Confidence histogram: frequency distribution of predicted scores across equal-width bins
import type { CalibrationSample } from "./calibrator.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

export interface HistogramBin {
  readonly lowerBound: number;
  readonly upperBound: number;
  /** Number of samples in this bin. */
  readonly count: number;
  /** Fraction of all samples in this bin. */
  readonly frequency: number;
  /** Mean predicted score within this bin. */
  readonly meanScore: number;
  /** Fraction of positive labels within this bin. */
  readonly positiveFraction: number;
}

export interface ConfidenceHistogram {
  readonly bins: readonly HistogramBin[];
  readonly n: number;
  readonly numBins: number;
}

/**
 * Build a confidence histogram from calibration samples.
 * Useful for visualising model over/under-confidence distributions.
 */
export function buildHistogram(
  samples: readonly CalibrationSample[],
  numBins = 10,
): Result<ConfidenceHistogram> {
  if (samples.length === 0) {
    return err(new Error("buildHistogram requires at least one sample"));
  }
  if (numBins < 1 || numBins > 1000) {
    return err(new Error("numBins must be between 1 and 1000"));
  }

  const n = samples.length;
  const binSize = 1 / numBins;

  type BinAcc = { sumScore: number; positives: number; count: number };
  const binAccs: BinAcc[] = Array.from({ length: numBins }, () => ({
    sumScore: 0,
    positives: 0,
    count: 0,
  }));

  for (const { score, label } of samples) {
    const idx = Math.min(Math.floor(score / binSize), numBins - 1);
    const acc = binAccs[idx];
    if (acc === undefined) continue;
    binAccs[idx] = {
      sumScore: acc.sumScore + score,
      positives: acc.positives + label,
      count: acc.count + 1,
    };
  }

  const bins: HistogramBin[] = binAccs.map(({ sumScore, positives, count }, i) => {
    const lowerBound = i * binSize;
    const upperBound = lowerBound + binSize;
    if (count === 0) {
      return { lowerBound, upperBound, count: 0, frequency: 0, meanScore: 0, positiveFraction: 0 };
    }
    return {
      lowerBound,
      upperBound,
      count,
      frequency: count / n,
      meanScore: sumScore / count,
      positiveFraction: positives / count,
    };
  });

  return ok({ bins, n, numBins });
}

/**
 * Compute the overconfidence ratio: fraction of samples where predicted score
 * exceeds the bin's positive fraction by more than `threshold`.
 */
export function overconfidenceRatio(
  histogram: ConfidenceHistogram,
  threshold = 0.1,
): number {
  const populated = histogram.bins.filter((b) => b.count > 0);
  if (populated.length === 0) return 0;
  const overconfident = populated.filter(
    (b) => b.meanScore - b.positiveFraction > threshold,
  );
  return overconfident.length / populated.length;
}
