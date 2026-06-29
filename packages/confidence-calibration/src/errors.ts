// Domain errors for confidence-calibration package
import { AppError } from "@veritas/core";

/** Thrown when a calibrator is used before being fitted. */
export class NotFittedError extends AppError {
  constructor(calibratorName: string) {
    super(
      "INTERNAL",
      500,
      `Calibrator "${calibratorName}" has not been fitted; call fit() or loadParams() first.`,
    );
    this.name = "NotFittedError";
  }
}

/** Thrown when calibration input data is invalid or insufficient. */
export class CalibrationDataError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Invalid calibration data: ${detail}`);
    this.name = "CalibrationDataError";
  }
}

/** Thrown when persisted calibration params cannot be parsed or loaded. */
export class InvalidParamsError extends AppError {
  constructor(calibratorName: string, detail: string) {
    super(
      "VALIDATION",
      400,
      `Invalid params for calibrator "${calibratorName}": ${detail}`,
    );
    this.name = "InvalidParamsError";
  }
}

/** Thrown when ensemble weights are inconsistent with the number of calibrators. */
export class EnsembleConfigError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Ensemble configuration error: ${detail}`);
    this.name = "EnsembleConfigError";
  }
}

/** Thrown when a verdict score is outside the valid [0, 1] range. */
export class ScoreRangeError extends AppError {
  constructor(score: number) {
    super("VALIDATION", 400, `Score ${score} is outside the valid [0, 1] range.`);
    this.name = "ScoreRangeError";
  }
}
