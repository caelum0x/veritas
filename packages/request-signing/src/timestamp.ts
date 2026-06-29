// Timestamp window validation to reject replayed or clock-skewed requests.

/** Default allowed clock skew: ±5 minutes in milliseconds. */
export const DEFAULT_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

/** Return the current time as unix seconds (integer). */
export function currentTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Returns true when the provided timestamp (unix seconds) falls within the
 * acceptable clock-skew window around now.
 *
 * @param timestampSeconds - Unix epoch seconds from the request header.
 * @param maxSkewMs - Maximum allowed skew in milliseconds (default 5 min).
 * @param nowMs - Override current time in ms (useful in tests).
 */
export function isTimestampValid(
  timestampSeconds: number,
  maxSkewMs: number = DEFAULT_TIMESTAMP_WINDOW_MS,
  nowMs: number = Date.now()
): boolean {
  const timestampMs = timestampSeconds * 1000;
  return Math.abs(nowMs - timestampMs) <= maxSkewMs;
}

/**
 * Parse a raw timestamp header value to unix seconds.
 * Accepts integer seconds or ISO 8601 strings.
 * Returns NaN on failure.
 */
export function parseTimestampHeader(raw: string): number {
  const trimmed = raw.trim();

  // ISO 8601
  if (/[T\-:]/.test(trimmed)) {
    const ms = Date.parse(trimmed);
    return isNaN(ms) ? NaN : Math.floor(ms / 1000);
  }

  const num = Number(trimmed);
  if (isNaN(num) || !Number.isFinite(num)) return NaN;

  // Heuristic: values > 1e11 are already milliseconds, convert to seconds
  return num > 1e11 ? Math.floor(num / 1000) : Math.floor(num);
}

export type TimestampValidation =
  | { readonly valid: true; readonly timestampSeconds: number }
  | { readonly valid: false; readonly reason: string };

/** Validate a raw timestamp header string end-to-end. */
export function validateTimestampHeader(
  raw: string,
  maxSkewMs: number = DEFAULT_TIMESTAMP_WINDOW_MS,
  nowMs: number = Date.now()
): TimestampValidation {
  const timestampSeconds = parseTimestampHeader(raw);
  if (isNaN(timestampSeconds)) {
    return { valid: false, reason: `unparseable timestamp: ${raw}` };
  }
  if (!isTimestampValid(timestampSeconds, maxSkewMs, nowMs)) {
    return {
      valid: false,
      reason: `timestamp out of window (maxSkewMs=${maxSkewMs})`,
    };
  }
  return { valid: true, timestampSeconds };
}
