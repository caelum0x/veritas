// Expected Calibration Error (ECE) and Maximum Calibration Error (MCE)
import type { CalibrationSample } from "./calibrator.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

export interface EceResult {
  /** Expected Calibration Error: weighted average of |confidence - accuracy| per bin. */
  readonly ece: number;
  /** Maximum Calibration Error: worst bin gap. */
  readonly mce: number;
  readonly bins: readonly EceBin[];
  readonly n: number;
}

export interface EceBin {
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly count: number;
  readonly meanConfidence: number;
  readonly accuracy: number;
  readonly gap: number;
}

/**
 * Compute ECE and MCE by bucketing samples into equal-width confidence bins.
 */
export function expectedCalibrationError(
  samples: readonly CalibrationSample[],
  numBins = 10,
): Result<EceResult> {
  if (samples.length === 0) {
    return err(new Error("expectedCalibrationError requires at least one sample"));
  }
  if (numBins < 1 || numBins > 1000) {
    return err(new Error("numBins must be between 1 and 1000"));
  }

  const n = samples.length;
  const binSize = 1 / numBins;

  type BinAcc = { sumConf: number; sumCorrect: number; count: number };
  const binAccs: BinAcc[] = Array.from({ length: numBins }, () => ({
    sumConf: 0,
    sumCorrect: 0,
    count: 0,
  }));

  for (const { score, label } of samples) {
    const idx = Math.min(Math.floor(score / binSize), numBins - 1);
    const acc = binAccs[idx];
    if (acc === undefined) continue;
    binAccs[idx] = {
      sumConf: acc.sumConf + score,
      sumCorrect: acc.sumCorrect + label,
      count: acc.count + 1,
    };
  }

  const bins: EceBin[] = [];
  let ece = 0;
  let mce = 0;

  for (let i = 0; i < numBins; i++) {
    const binEntry = binAccs[i];
    if (binEntry === undefined) continue;
    const { sumConf, sumCorrect, count } = binEntry;
    const lowerBound = i * binSize;
    const upperBound = lowerBound + binSize;

    if (count === 0) {
      bins.push({ lowerBound, upperBound, count: 0, meanConfidence: 0, accuracy: 0, gap: 0 });
      continue;
    }

    const meanConfidence = sumConf / count;
    const accuracy = sumCorrect / count;
    const gap = Math.abs(meanConfidence - accuracy);

    ece += (count / n) * gap;
    if (gap > mce) mce = gap;

    bins.push({ lowerBound, upperBound, count, meanConfidence, accuracy, gap });
  }

  return ok({ ece, mce, bins, n });
}
