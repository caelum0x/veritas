// Platt scaling: fits a logistic regression A*f(x) + B on model scores
import { ok, err, type Result } from "@veritas/core";
import type {
  Calibrator,
  CalibrationSample,
  CalibrationParams,
  RawScore,
  CalibratedScore,
} from "./calibrator.js";

const MIN_SAMPLES = 2;
const MAX_ITER = 100;
const LEARNING_RATE = 0.01;
const EPS = 1e-7;

interface PlattParams {
  readonly A: number;
  readonly B: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function gradientDescent(
  samples: readonly CalibrationSample[],
): PlattParams {
  let A = 0;
  let B = 0;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let dA = 0;
    let dB = 0;

    for (const { score, label } of samples) {
      const p = sigmoid(A * score + B);
      const diff = p - label;
      dA += diff * score;
      dB += diff;
    }

    A -= (LEARNING_RATE * dA) / samples.length;
    B -= (LEARNING_RATE * dB) / samples.length;
  }

  return { A, B };
}

/** Platt scaling calibrator using logistic sigmoid transformation. */
export class PlattCalibrator implements Calibrator {
  readonly name = "platt";
  private params: PlattParams | null = null;

  fit(samples: readonly CalibrationSample[]): Result<CalibrationParams> {
    if (samples.length < MIN_SAMPLES) {
      return err(new Error(`Platt scaling requires at least ${MIN_SAMPLES} samples`));
    }

    const fitted = gradientDescent(samples);
    this.params = fitted;
    return ok({ A: fitted.A, B: fitted.B });
  }

  predict(score: RawScore): Result<CalibratedScore> {
    if (this.params === null) {
      return err(new Error("PlattCalibrator not fitted; call fit() or loadParams() first"));
    }
    const calibrated = sigmoid(this.params.A * score + this.params.B);
    return ok(Math.min(1 - EPS, Math.max(EPS, calibrated)));
  }

  loadParams(params: CalibrationParams): Result<void> {
    const A = params["A"];
    const B = params["B"];
    if (typeof A !== "number" || typeof B !== "number") {
      return err(new Error("Invalid Platt params: expected numeric A and B"));
    }
    this.params = { A, B };
    return ok(undefined);
  }

  exportParams(): Result<CalibrationParams> {
    if (this.params === null) {
      return err(new Error("No params to export; fit first"));
    }
    return ok({ A: this.params.A, B: this.params.B });
  }
}
