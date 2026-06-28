// Reliability diagram data: bins model confidence vs observed accuracy for visual calibration check
import { ok, err, type Result } from "@veritas/core";
import type { CalibrationSample } from "./calibrator.js";

export interface ReliabilityBin {
  /** Lower bound of the bin (inclusive). */
  readonly lowerBound: number;
  /** Upper bound of the bin (exclusive, except last bin). */
  readonly upperBound: number;
  /** Mean predicted confidence within this bin. */
  readonly meanConfidence: number;
  /** Fraction of positive labels within this bin (observed accuracy). */
  readonly observedAccuracy: number;
  /** Number of samples in this bin. */
  readonly count: number;
}

export interface ReliabilityDiagram {
  readonly bins: readonly ReliabilityBin[];
  readonly numBins: number;
}

export interface ReliabilityOptions {
  /** Number of equal-width bins. Defaults to 10. */
  readonly numBins?: number;
}

/** Build reliability diagram data from calibration samples. */
export function buildReliabilityDiagram(
  samples: readonly CalibrationSample[],
  options: ReliabilityOptions = {},
): Result<ReliabilityDiagram> {
  if (samples.length === 0) {
    return err(new Error("Cannot build reliability diagram from empty sample set"));
  }

  const numBins = options.numBins ?? 10;
  if (!Number.isInteger(numBins) || numBins < 2 || numBins > 100) {
    return err(new Error("numBins must be an integer between 2 and 100"));
  }

  // Initialize accumulators
  const binSumConfidence = new Array<number>(numBins).fill(0);
  const binSumLabels = new Array<number>(numBins).fill(0);
  const binCounts = new Array<number>(numBins).fill(0);

  for (const { score, label } of samples) {
    const binIdx = Math.min(Math.floor(score * numBins), numBins - 1);
    binSumConfidence[binIdx] = (binSumConfidence[binIdx] ?? 0) + score;
    binSumLabels[binIdx] = (binSumLabels[binIdx] ?? 0) + label;
    binCounts[binIdx] = (binCounts[binIdx] ?? 0) + 1;
  }

  const bins: ReliabilityBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const count = binCounts[i] ?? 0;
    const lowerBound = i / numBins;
    const upperBound = (i + 1) / numBins;

    if (count === 0) {
      bins.push({
        lowerBound,
        upperBound,
        meanConfidence: (lowerBound + upperBound) / 2,
        observedAccuracy: 0,
        count: 0,
      });
    } else {
      bins.push({
        lowerBound,
        upperBound,
        meanConfidence: (binSumConfidence[i] ?? 0) / count,
        observedAccuracy: (binSumLabels[i] ?? 0) / count,
        count,
      });
    }
  }

  return ok({ bins, numBins });
}
