// TTL helpers — compute expiry timestamps and check staleness.

/** Returns absolute expiry epoch (ms) from a TTL duration in ms, or undefined if no TTL. */
export function expiresAt(ttlMs: number | undefined): number | undefined {
  return ttlMs !== undefined ? Date.now() + ttlMs : undefined;
}

/** Returns true if the entry has expired. An undefined expiresAt means it never expires. */
export function isExpired(expiresAtMs: number | undefined): boolean {
  if (expiresAtMs === undefined) return false;
  return Date.now() >= expiresAtMs;
}

/** Returns remaining TTL in ms, or undefined if no expiry. Returns 0 if already expired. */
export function remainingTtl(expiresAtMs: number | undefined): number | undefined {
  if (expiresAtMs === undefined) return undefined;
  return Math.max(0, expiresAtMs - Date.now());
}

/** Clamps a TTL to a maximum allowed value. */
export function clampTtl(ttlMs: number, maxTtlMs: number): number {
  return Math.min(ttlMs, maxTtlMs);
}

/** Returns the current time in milliseconds. */
export function nowMs(): number {
  return Date.now();
}

/** Converts seconds to milliseconds TTL. */
export function ttlFromSeconds(seconds: number): number {
  return seconds * 1_000;
}

/** Converts minutes to milliseconds TTL. */
export function ttlFromMinutes(minutes: number): number {
  return minutes * 60_000;
}

/** Converts hours to milliseconds TTL. */
export function ttlFromHours(hours: number): number {
  return hours * 3_600_000;
}
