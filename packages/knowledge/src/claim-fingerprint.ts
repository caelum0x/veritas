// Produces a stable content-hash fingerprint for a claim text, used as a cache key.

import { contentHash, canonicalize, type ContentHash } from "@veritas/core";

/** Normalizes and hashes claim text into a stable fingerprint. */
export function fingerprintClaim(claimText: string): ContentHash {
  const normalized = claimText.trim().toLowerCase().replace(/\s+/g, " ");
  return contentHash(canonicalize({ claim: normalized }));
}

/** Produces a fingerprint from structured claim data (text + optional context). */
export function fingerprintClaimWithContext(
  claimText: string,
  context: Readonly<Record<string, unknown>> = {},
): ContentHash {
  const normalized = claimText.trim().toLowerCase().replace(/\s+/g, " ");
  return contentHash(canonicalize({ claim: normalized, context }));
}
