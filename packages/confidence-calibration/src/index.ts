// Public surface of @veritas/confidence-calibration
export type {
  Calibrator,
  CalibrationSample,
  CalibrationParams,
  RawScore,
  CalibratedScore,
} from "./calibrator.js";

export type {
  RawConfidence,
  CalibratedConfidence,
  CalibrationStrategy,
  ScoredVerdict,
  CalibratedVerdict,
  CalibrationSnapshot,
  CalibrationMetrics,
} from "./types.js";
export { calibrationSnapshotSchema, scoredVerdictSchema } from "./types.js";

export {
  NotFittedError,
  CalibrationDataError,
  InvalidParamsError,
  EnsembleConfigError,
  ScoreRangeError,
} from "./errors.js";

export { PlattCalibrator } from "./platt.js";

export { applyOne, applyBatch, applyWithFallback } from "./apply.js";
export type { ApplyOptions } from "./apply.js";

export { brierScore, brierDecompose } from "./brier.js";
export type { BrierResult, BrierDecomposition } from "./brier.js";

export { expectedCalibrationError } from "./ece.js";
export type { EceResult, EceBin } from "./ece.js";
