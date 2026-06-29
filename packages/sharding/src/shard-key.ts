// Derive a canonical shard key string from a routing discriminant value.

import { sha256Hex } from "@veritas/core";

/**
 * A shard key is a normalised string used to place data on a specific shard.
 * All values are lowercased and trimmed before hashing to ensure stability.
 */
export type ShardKey = string & { readonly _brand: "ShardKey" };

/** Create a ShardKey from an arbitrary discriminant (e.g. tenant id, claim id). */
export function makeShardKey(discriminant: string): ShardKey {
  const normalised = discriminant.trim().toLowerCase();
  return normalised as ShardKey;
}

/**
 * Derive a deterministic numeric slot (0 – slotCount-1) from a shard key.
 * Uses the first 8 hex characters of SHA-256 to stay within 2^32.
 */
export function slotOf(key: ShardKey, slotCount: number): number {
  if (slotCount < 1) throw new RangeError("slotCount must be >= 1");
  const hex = sha256Hex(key).slice(0, 8);
  const value = parseInt(hex, 16);
  return value % slotCount;
}

/** Produce a composite shard key by joining multiple parts with a separator. */
export function compositeKey(parts: readonly string[], sep = ":"): ShardKey {
  return makeShardKey(parts.join(sep));
}
