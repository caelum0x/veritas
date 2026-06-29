// Derive a SHA-256 content hash over the canonical JSON representation of a value.

import { contentHash, type ContentHash } from "@veritas/core";
import { canonicalJson } from "./canonical.js";

/**
 * Compute a stable content hash over any value via canonical JSON serialization.
 * Returns a "sha256:<hex>" branded string from core.
 */
export function hashProvenance(value: unknown): ContentHash {
  // canonicalJson produces the same string used for hashing, so we pass the
  // already-canonicalized string directly to avoid double-serialization.
  return contentHash(canonicalJson(value));
}

/**
 * Return the raw hex digest (without the "sha256:" prefix) for compact storage.
 */
export function provenanceHex(value: unknown): string {
  const full = hashProvenance(value);
  return full.slice("sha256:".length);
}
