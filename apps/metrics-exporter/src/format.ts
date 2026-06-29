// Helpers for formatting numeric values in Prometheus text exposition format.

/** Format a finite number as a Prometheus-compatible string. */
export function formatNumber(value: number): string {
  if (!isFinite(value)) {
    if (value === Infinity) return "+Inf";
    if (value === -Infinity) return "-Inf";
    return "NaN";
  }
  // Prometheus requires no trailing zeros and at least one decimal digit for
  // floats; integers are emitted without a decimal point.
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

/** Format a Unix timestamp in milliseconds as Prometheus millisecond integer. */
export function formatTimestamp(ms: number): string {
  return String(Math.round(ms));
}

/** Clamp a histogram bucket count to a non-negative integer. */
export function clampBucketCount(n: number): number {
  return Math.max(0, Math.round(n));
}
