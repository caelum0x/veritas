// Hash bucketing: deterministically maps a unit+seed to a [0,1) bucket value.

import { sha256Hex } from "@veritas/core";

const BUCKET_RESOLUTION = 10_000;

/**
 * Hash a subject key and salt into a deterministic bucket in [0, 1).
 * Uses SHA-256 of `${salt}:${subjectKey}`, takes first 8 hex chars as uint32.
 */
export function hashToBucket(subjectKey: string, salt: string): number {
  const input = `${salt}:${subjectKey}`;
  const hex = sha256Hex(input);
  // Take first 8 hex chars → 32-bit integer
  const uint32 = parseInt(hex.slice(0, 8), 16);
  return (uint32 >>> 0) / 0x1_0000_0000;
}

/**
 * Map a bucket value in [0,1) to an integer bucket in [0, resolution).
 */
export function toBucketIndex(bucket: number, resolution: number = BUCKET_RESOLUTION): number {
  return Math.floor(bucket * resolution);
}

/**
 * Check whether a bucket value falls within the allocation percentage [0,1].
 */
export function isInAllocation(bucket: number, allocation: number): boolean {
  return bucket < allocation;
}

/**
 * Given cumulative weight ranges, find the variant index for a bucket value.
 * weights must sum to ≤ 1; returns -1 if bucket exceeds total weight.
 */
export function findVariantIndex(bucket: number, weights: readonly number[]): number {
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]!;
    if (bucket < cumulative) return i;
  }
  return -1;
}

/**
 * Build cumulative thresholds from weight array for fast range lookups.
 */
export function buildCumulativeThresholds(weights: readonly number[]): readonly number[] {
  const result: number[] = [];
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w;
    result.push(cumulative);
  }
  return result;
}
