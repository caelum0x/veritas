// Temperature scaling: single-parameter calibration via softmax temperature T
import { ok, err, type Result } from "@veritas/core";
import type {
  Calibrator,
  CalibrationSample,
  CalibrationParams,
  RawScore,
  CalibratedScore,
} from "./calibrator.js";

const MIN_SAMPLES = 2;
const MAX_ITER = 200;
const LEARNING_RATE = 0.1;
const MIN_TEMP = 1e-3;
const MAX_TEMP = 1e3;
const EPS = 1e-7;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Negative log-likelihood loss for logit-level temperature scaling. */
function nllLoss(samples: readonly CalibrationSample[], T: number): number {
  let loss = 0;
  for (const { score, label } of samples) {
    // treat raw score as logit; scale by 1/T then sigmoid
    const p = sigmoid(score / T);
    loss -= label * Math.log(p + EPS) + (1 - label) * Math.log(1 - p + EPS);
  }
  return loss / samples.length;
}

function fitTemperature(samples: readonly CalibrationSample[]): number {
  let T = 1.0;
  const n = samples.length;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let grad = 0;
    for (const { score, label } of samples) {
      const logit = score / T;
      const p = sigmoid(logit);
      // d(NLL)/dT = (p - label) * (-score / T^2)
      grad += (p - label) * (-score / (T * T));
    }
    grad /= n;

    T = T - LEARNING_RATE * grad;
    T = Math.max(MIN_TEMP, Math.min(MAX_TEMP, T));
  }

  return T;
}

/** Temperature scaling calibrator: divides logit scores by learned temperature T. */
export class TemperatureCalibrator implements Calibrator {
  readonly name = "temperature";
  private temperature: number | null = null;

  fit(samples: readonly CalibrationSample[]): Result<CalibrationParams> {
    if (samples.length < MIN_SAMPLES) {
      return err(new Error(`Temperature scaling requires at least ${MIN_SAMPLES} samples`));
    }

    const T = fitTemperature(samples);
    this.temperature = T;
    return ok({ temperature: T, nll: nllLoss(samples, T) });
  }

  predict(score: RawScore): Result<CalibratedScore> {
    if (this.temperature === null) {
      return err(new Error("TemperatureCalibrator not fitted; call fit() or loadParams() first"));
    }
    const calibrated = sigmoid(score / this.temperature);
    return ok(Math.min(1 - EPS, Math.max(EPS, calibrated)));
  }

  loadParams(params: CalibrationParams): Result<void> {
    const t = params["temperature"];
    if (typeof t !== "number" || t <= 0) {
      return err(new Error("Invalid temperature params: expected positive numeric temperature"));
    }
    this.temperature = t;
    return ok(undefined);
  }

  exportParams(): Result<CalibrationParams> {
    if (this.temperature === null) {
      return err(new Error("No params to export; fit first"));
    }
    return ok({ temperature: this.temperature });
  }
}
