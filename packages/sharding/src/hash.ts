// Hashing utilities for shard key derivation and ring placement.

import { createHash } from "node:crypto";

/**
 * Compute a 32-bit unsigned integer hash of a string using MurmurHash3-inspired
 * mixing on top of SHA-256 (deterministic, uniform distribution).
 */
export function hashToUint32(input: string): number {
  const hex = createHash("sha256").update(input, "utf8").digest("hex");
  // Take the first 8 hex chars (32 bits) and parse as unsigned integer.
  return (parseInt(hex.slice(0, 8), 16) >>> 0);
}

/**
 * Map a string to a position in [0, ringSize) using SHA-256 mod.
 */
export function hashToRingPosition(input: string, ringSize: number): number {
  if (ringSize <= 0) throw new RangeError("ringSize must be > 0");
  const h = hashToUint32(input);
  return h % ringSize;
}

/**
 * Compute a hex digest for a composite key built from parts.
 */
export function compositeHash(parts: readonly string[]): string {
  const joined = parts.join("\0");
  return createHash("sha256").update(joined, "utf8").digest("hex");
}

/**
 * Normalise a raw key string to a consistent lowercase trimmed form.
 */
export function normaliseKey(raw: string): string {
  return raw.trim().toLowerCase();
}
