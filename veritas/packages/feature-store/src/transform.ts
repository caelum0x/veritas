// Feature transforms: composable, typed pipeline steps that convert raw values into feature-ready scalars.

import { ok, err, type Result } from "@veritas/core";
import { type FeatureStoreError, FeatureStoreError as FSError } from "./errors.js";

/** A single transform step operating on an unknown input value. */
export interface FeatureTransform<TIn = unknown, TOut = unknown> {
  readonly name: string;
  apply(value: TIn): Result<TOut, FeatureStoreError>;
}

/** Identity transform — passes the value through unchanged. */
export const identityTransform: FeatureTransform = {
  name: "identity",
  apply(value: unknown): Result<unknown, FeatureStoreError> {
    return ok(value);
  },
};

/** Clamp a numeric value to [min, max]. */
export function clampTransform(min: number, max: number): FeatureTransform<number, number> {
  return {
    name: `clamp(${min},${max})`,
    apply(value: number): Result<number, FeatureStoreError> {
      if (typeof value !== "number" || !isFinite(value)) {
        return err(new FSError(`clampTransform: expected finite number, got ${typeof value}`));
      }
      return ok(Math.min(max, Math.max(min, value)));
    },
  };
}

/** Normalize a numeric value to [0,1] given a known [min, max] range. */
export function normalizeTransform(min: number, max: number): FeatureTransform<number, number> {
  const range = max - min;
  return {
    name: `normalize(${min},${max})`,
    apply(value: number): Result<number, FeatureStoreError> {
      if (typeof value !== "number" || !isFinite(value)) {
        return err(new FSError(`normalizeTransform: expected finite number, got ${typeof value}`));
      }
      if (range === 0) return ok(0);
      return ok((value - min) / range);
    },
  };
}

/** Log-transform: applies Math.log(value + offset). */
export function logTransform(offset = 1): FeatureTransform<number, number> {
  return {
    name: `log(offset=${offset})`,
    apply(value: number): Result<number, FeatureStoreError> {
      if (typeof value !== "number" || !isFinite(value)) {
        return err(new FSError(`logTransform: expected finite number, got ${typeof value}`));
      }
      const arg = value + offset;
      if (arg <= 0) {
        return err(new FSError(`logTransform: log argument must be > 0, got ${arg}`));
      }
      return ok(Math.log(arg));
    },
  };
}

/** Z-score standardization: (value - mean) / stddev. */
export function zScoreTransform(mean: number, stddev: number): FeatureTransform<number, number> {
  return {
    name: `zscore(mean=${mean},std=${stddev})`,
    apply(value: number): Result<number, FeatureStoreError> {
      if (typeof value !== "number" || !isFinite(value)) {
        return err(new FSError(`zScoreTransform: expected finite number, got ${typeof value}`));
      }
      if (stddev === 0) return ok(0);
      return ok((value - mean) / stddev);
    },
  };
}

/** Fill missing values (null/undefined/NaN) with a default. */
export function fillMissingTransform(defaultValue: number): FeatureTransform<unknown, number> {
  return {
    name: `fillMissing(${defaultValue})`,
    apply(value: unknown): Result<number, FeatureStoreError> {
      if (value === null || value === undefined) return ok(defaultValue);
      if (typeof value === "number" && isNaN(value)) return ok(defaultValue);
      if (typeof value !== "number") {
        return err(new FSError(`fillMissingTransform: expected number or null/undefined, got ${typeof value}`));
      }
      return ok(value);
    },
  };
}

/** Compose a pipeline of transforms left-to-right; fails fast on first error. */
export function composeTransforms(
  transforms: ReadonlyArray<FeatureTransform>,
): FeatureTransform {
  return {
    name: transforms.map((t) => t.name).join(" -> "),
    apply(value: unknown): Result<unknown, FeatureStoreError> {
      let current: unknown = value;
      for (const transform of transforms) {
        const result = transform.apply(current);
        if (result.ok === false) return result;
        current = result.value;
      }
      return ok(current);
    },
  };
}
