// Produce a deterministic, key-sorted JSON string for provenance hashing.

import { canonicalize as coreCanonicalize } from "@veritas/core";

/**
 * Return a canonical (key-sorted, deterministic) JSON string for any value.
 * Delegates to the core canonicalize utility so the algorithm stays in one place.
 */
export function canonicalJson(value: unknown): string {
  return coreCanonicalize(value);
}
