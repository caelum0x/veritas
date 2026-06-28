// Standalone numeric clamping and rounding helpers.

/** Clamp `value` into [min, max]. */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to a fixed number of decimal places. */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** True if two numbers are within `epsilon` of each other. */
export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}
