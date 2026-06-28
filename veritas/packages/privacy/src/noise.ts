// Laplace and Gaussian noise mechanisms for differential privacy.
import { ok, err, type Result } from "@veritas/core";
import { InvalidNoiseParameterError } from "./errors.js";

/** Samples from Laplace(0, scale) using the inverse CDF method. */
function sampleLaplace(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/** Samples from N(0,1) using Box-Muller transform. */
function sampleStandardNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Add Laplace noise calibrated to (sensitivity / epsilon).
 * Returns the noised value or an error if parameters are invalid.
 */
export function laplaceNoise(
  value: number,
  sensitivity: number,
  epsilon: number
): Result<number, InvalidNoiseParameterError> {
  if (sensitivity <= 0) {
    return err(new InvalidNoiseParameterError({ message: "sensitivity must be positive" }));
  }
  if (epsilon <= 0) {
    return err(new InvalidNoiseParameterError({ message: "epsilon must be positive" }));
  }
  const scale = sensitivity / epsilon;
  return ok(value + sampleLaplace(scale));
}

/**
 * Add Gaussian noise calibrated for (epsilon, delta)-DP.
 * sigma = sqrt(2 * ln(1.25/delta)) * sensitivity / epsilon.
 */
export function gaussianNoise(
  value: number,
  sensitivity: number,
  epsilon: number,
  delta: number
): Result<number, InvalidNoiseParameterError> {
  if (sensitivity <= 0) {
    return err(new InvalidNoiseParameterError({ message: "sensitivity must be positive" }));
  }
  if (epsilon <= 0) {
    return err(new InvalidNoiseParameterError({ message: "epsilon must be positive" }));
  }
  if (delta <= 0 || delta >= 1) {
    return err(new InvalidNoiseParameterError({ message: "delta must be in (0,1)" }));
  }
  const sigma = Math.sqrt(2 * Math.log(1.25 / delta)) * (sensitivity / epsilon);
  return ok(value + sigma * sampleStandardNormal());
}

/** Add noise to an array of numeric values using Laplace mechanism. */
export function addLaplaceNoiseToArray(
  values: ReadonlyArray<number>,
  sensitivity: number,
  epsilon: number
): Result<ReadonlyArray<number>, InvalidNoiseParameterError> {
  if (sensitivity <= 0) {
    return err(new InvalidNoiseParameterError({ message: "sensitivity must be positive" }));
  }
  if (epsilon <= 0) {
    return err(new InvalidNoiseParameterError({ message: "epsilon must be positive" }));
  }
  const scale = sensitivity / epsilon;
  return ok(values.map((v) => v + sampleLaplace(scale)));
}
