// Brier score: mean squared error between predicted probabilities and binary labels
import type { CalibrationSample } from "./calibrator.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

/** Brier score result: lower is better; 0 = perfect, 1 = worst. */
export interface BrierResult {
  readonly score: number;
  readonly n: number;
}

/**
 * Compute Brier score for a set of calibration samples.
 * BS = (1/N) * sum((p_i - y_i)^2)
 */
export function brierScore(samples: readonly CalibrationSample[]): Result<BrierResult> {
  if (samples.length === 0) {
    return err(new Error("brierScore requires at least one sample"));
  }

  const sum = samples.reduce((acc, { score, label }) => {
    const diff = score - label;
    return acc + diff * diff;
  }, 0);

  return ok({ score: sum / samples.length, n: samples.length });
}

/**
 * Decompose Brier score into reliability, resolution, and uncertainty.
 * Uses the Murphy (1973) decomposition.
 */
export interface BrierDecomposition {
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly brierScore: number;
}

export function brierDecompose(
  samples: readonly CalibrationSample[],
  bins = 10,
): Result<BrierDecomposition> {
  if (samples.length === 0) {
    return err(new Error("brierDecompose requires at least one sample"));
  }

  const n = samples.length;
  const meanLabel = samples.reduce((s, x) => s + x.label, 0) / n;
  const uncertainty = meanLabel * (1 - meanLabel);

  // Group into bins by predicted score
  const binSize = 1 / bins;
  type BinAcc = { sumScore: number; sumLabel: number; count: number };
  const binMap = new Map<number, BinAcc>();

  for (const { score, label } of samples) {
    const binIdx = Math.min(Math.floor(score / binSize), bins - 1);
    const existing = binMap.get(binIdx) ?? { sumScore: 0, sumLabel: 0, count: 0 };
    binMap.set(binIdx, {
      sumScore: existing.sumScore + score,
      sumLabel: existing.sumLabel + label,
      count: existing.count + 1,
    });
  }

  let reliability = 0;
  let resolution = 0;

  for (const { sumScore, sumLabel, count } of binMap.values()) {
    const meanBinScore = sumScore / count;
    const meanBinLabel = sumLabel / count;
    reliability += count * (meanBinScore - meanBinLabel) ** 2;
    resolution += count * (meanBinLabel - meanLabel) ** 2;
  }

  reliability /= n;
  resolution /= n;

  return ok({
    reliability,
    resolution,
    uncertainty,
    brierScore: reliability - resolution + uncertainty,
  });
}
