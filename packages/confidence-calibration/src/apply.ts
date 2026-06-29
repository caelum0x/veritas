// Apply a fitted calibrator to ScoredVerdict objects, producing CalibratedVerdict results
import { ok, err, isOk, type Result } from "@veritas/core";
import type { Calibrator } from "./calibrator.js";
import type {
  ScoredVerdict,
  CalibratedVerdict,
  CalibrationStrategy,
} from "./types.js";
import { ScoreRangeError } from "./errors.js";

/** Options controlling batch calibration behaviour. */
export interface ApplyOptions {
  /** If true, a single failed prediction aborts the entire batch. Default: false. */
  readonly failFast?: boolean;
}

/**
 * Apply a single calibrator to one ScoredVerdict.
 * Returns a CalibratedVerdict or an error.
 */
export function applyOne(
  calibrator: Calibrator,
  sv: ScoredVerdict,
  strategy: CalibrationStrategy,
): Result<CalibratedVerdict> {
  if (sv.rawConfidence < 0 || sv.rawConfidence > 1) {
    return err(new ScoreRangeError(sv.rawConfidence));
  }

  const predicted = calibrator.predict(sv.rawConfidence);
  if (!isOk(predicted)) {
    return err(predicted.error);
  }

  const calibrated: CalibratedVerdict = {
    verdict: sv.verdict,
    rawConfidence: sv.rawConfidence,
    calibratedConfidence: predicted.value,
    strategy,
    sourceId: sv.sourceId,
  };

  return ok(calibrated);
}

/**
 * Apply a calibrator to every item in a batch of ScoredVerdicts.
 *
 * - With `failFast: true`  → returns the first error encountered.
 * - With `failFast: false` (default) → returns all successful results; skips failures.
 */
export function applyBatch(
  calibrator: Calibrator,
  verdicts: readonly ScoredVerdict[],
  strategy: CalibrationStrategy,
  options: ApplyOptions = {},
): Result<readonly CalibratedVerdict[]> {
  const { failFast = false } = options;
  const results: CalibratedVerdict[] = [];

  for (const sv of verdicts) {
    const result = applyOne(calibrator, sv, strategy);
    if (!isOk(result)) {
      if (failFast) return err(result.error);
      // skip failures in lenient mode
      continue;
    }
    results.push(result.value);
  }

  return ok(results);
}

/**
 * Apply multiple calibrators to a single ScoredVerdict and return the first success.
 * Useful for fallback chains where a primary calibrator may not be fitted.
 */
export function applyWithFallback(
  calibrators: ReadonlyArray<{ calibrator: Calibrator; strategy: CalibrationStrategy }>,
  sv: ScoredVerdict,
): Result<CalibratedVerdict> {
  if (calibrators.length === 0) {
    return err(new Error("applyWithFallback: no calibrators provided"));
  }

  let lastError: unknown = new Error("applyWithFallback: all calibrators failed");
  for (const { calibrator, strategy } of calibrators) {
    const result = applyOne(calibrator, sv, strategy);
    if (isOk(result)) return result;
    lastError = result.error;
  }

  return err(lastError);
}
