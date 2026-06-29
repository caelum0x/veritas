// Percentage-based rollout using stable hashing for consistent assignment
import { sha256Hex } from "@veritas/core";

/** Compute a deterministic 0–99 bucket for a given key */
export function computeBucket(flagKey: string, contextKey: string): number {
  const hash = sha256Hex(`${flagKey}:${contextKey}`);
  const hex = hash.slice(0, 8);
  const int = parseInt(hex, 16);
  return int % 100;
}

/** Returns true if contextKey falls within the rollout percentage (0–100) */
export function isInRollout(
  flagKey: string,
  contextKey: string,
  percentage: number
): boolean {
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  const bucket = computeBucket(flagKey, contextKey);
  return bucket < percentage;
}
