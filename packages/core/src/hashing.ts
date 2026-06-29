// SHA-256 hashing and content-addressable hashing over canonical JSON.

import { createHash } from "node:crypto";
import { canonicalize } from "./json.js";

/** A content hash string of the form "sha256:<hex>". */
export type ContentHash = `sha256:${string}`;

/** Compute the lowercase hex SHA-256 digest of a string or buffer. */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Compute a stable content hash over any value via canonical JSON.
 * Equal logical values always produce the same hash.
 */
export function contentHash(value: unknown): ContentHash {
  return `sha256:${sha256Hex(canonicalize(value))}`;
}

/** Validate the "sha256:<64-hex>" shape. */
export function isContentHash(value: string): value is ContentHash {
  return /^sha256:[0-9a-f]{64}$/.test(value);
}
