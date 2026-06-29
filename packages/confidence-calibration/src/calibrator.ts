// Calibrator interface: contract for all confidence calibration strategies
import type { Result } from "@veritas/core";

/** Raw (uncalibrated) probability score in [0, 1]. */
export type RawScore = number;

/** Calibrated probability score in [0, 1]. */
export type CalibratedScore = number;

/** A single training sample: model output probability + ground-truth label (0 or 1). */
export interface CalibrationSample {
  readonly score: RawScore;
  readonly label: 0 | 1;
}

/** Parameters stored/loaded by a calibrator after fitting. */
export type CalibrationParams = Readonly<Record<string, unknown>>;

/** Core interface every calibration strategy must implement. */
export interface Calibrator {
  /** Human-readable name for this strategy. */
  readonly name: string;

  /**
   * Fit the calibrator on a set of labelled samples.
   * Returns updated params or an error.
   */
  fit(samples: readonly CalibrationSample[]): Result<CalibrationParams>;

  /**
   * Transform a raw score into a calibrated probability.
   * Must be called after fit() or loadParams().
   */
  predict(score: RawScore): Result<CalibratedScore>;

  /** Restore calibrator state from previously-persisted params. */
  loadParams(params: CalibrationParams): Result<void>;

  /** Export current params for persistence. */
  exportParams(): Result<CalibrationParams>;
}
