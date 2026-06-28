// ISO-8601 timestamp branded type and parsing helpers.

import type { Brand } from "./brand.js";

/** An ISO-8601 UTC timestamp string, e.g. "2024-01-01T00:00:00.000Z". */
export type IsoTimestamp = Brand<string, "IsoTimestamp">;

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/** Validate that a string is a well-formed ISO-8601 timestamp. */
export function isIsoTimestamp(value: string): value is IsoTimestamp {
  return ISO_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Convert epoch milliseconds to a normalized ISO-8601 UTC timestamp. */
export function epochToIso(epochMs: number): IsoTimestamp {
  return new Date(epochMs).toISOString() as IsoTimestamp;
}

/** Parse an ISO timestamp to epoch milliseconds, or null if invalid. */
export function isoToEpoch(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Coerce a string into a branded IsoTimestamp, throwing if invalid. */
export function asIsoTimestamp(value: string): IsoTimestamp {
  if (!isIsoTimestamp(value)) {
    throw new Error(`Invalid ISO-8601 timestamp: ${value}`);
  }
  return value;
}
