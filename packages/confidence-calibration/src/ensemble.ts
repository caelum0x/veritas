// Ensemble combiner: merge calibrated scores from multiple calibrators via weighted average
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Calibrator, RawScore, CalibratedScore } from "./calibrator.js";

export interface EnsembleMember {
  readonly calibrator: Calibrator;
  /** Relative weight in [0, ∞). Will be normalised to sum to 1. */
  readonly weight: number;
}

export interface EnsembleResult {
  readonly calibrated: CalibratedScore;
  /** Per-member calibrated scores after weighting. */
  readonly contributions: readonly { name: string; score: CalibratedScore; weight: number }[];
}

/**
 * Combine multiple calibrators via normalised weighted average.
 * All calibrators must already be fitted / params loaded.
 */
export function ensembleCombine(
  members: readonly EnsembleMember[],
  rawScore: RawScore,
): Result<EnsembleResult> {
  if (members.length === 0) {
    return err(new Error("ensembleCombine requires at least one member"));
  }

  const totalWeight = members.reduce((s, m) => s + m.weight, 0);
  if (totalWeight <= 0) {
    return err(new Error("Sum of ensemble weights must be positive"));
  }

  const contributions: Array<{ name: string; score: CalibratedScore; weight: number }> = [];
  let combined = 0;

  for (const { calibrator, weight } of members) {
    const result = calibrator.predict(rawScore);
    if (!result.ok) {
      return err(new Error(`Calibrator "${calibrator.name}" failed: ${String(result.error)}`));
    }
    const normWeight = weight / totalWeight;
    combined += normWeight * result.value;
    contributions.push({ name: calibrator.name, score: result.value, weight: normWeight });
  }

  return ok({ calibrated: combined, contributions });
}

/**
 * Build an ensemble calibrator that adapts the Calibrator interface.
 * predict() calls ensembleCombine internally.
 */
export function makeEnsembleCalibrator(members: readonly EnsembleMember[]): Calibrator {
  return {
    name: "ensemble",

    fit(_samples) {
      // Fitting is delegated to individual members; call their fit() separately.
      return ok({});
    },

    predict(score: RawScore): Result<CalibratedScore> {
      const r = ensembleCombine(members, score);
      if (!r.ok) return r;
      return ok(r.value.calibrated);
    },

    loadParams(_params) {
      return ok(undefined);
    },

    exportParams() {
      return ok({ memberNames: members.map((m) => m.calibrator.name) });
    },
  };
}
