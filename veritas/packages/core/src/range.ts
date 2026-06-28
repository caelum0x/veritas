// Numeric range value object with containment and clamping.

import { ValidationError } from "./errors/validation-error.js";

/** An inclusive numeric range [min, max]. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/** Construct a range, validating that min <= max. */
export function range(min: number, max: number): Range {
  if (min > max) {
    throw new ValidationError({ message: `Invalid range: min ${min} > max ${max}` });
  }
  return { min, max };
}

/** Is `value` within the inclusive range? */
export function contains(r: Range, value: number): boolean {
  return value >= r.min && value <= r.max;
}

/** Clamp `value` into the range. */
export function clamp(r: Range, value: number): number {
  return Math.min(r.max, Math.max(r.min, value));
}

/** Width of the range (max - min). */
export function width(r: Range): number {
  return r.max - r.min;
}

/** Linearly interpolate; t in [0,1] maps to [min,max]. */
export function lerp(r: Range, t: number): number {
  return r.min + (r.max - r.min) * t;
}

/** The unit range [0, 1], common for scores and probabilities. */
export const UNIT_RANGE: Range = { min: 0, max: 1 };
