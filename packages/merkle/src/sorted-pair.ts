// Sorted-pair hashing (OpenZeppelin-style): hash(min(a,b) || max(a,b)).
import { createHash } from "node:crypto";
import { HexHash, asHexHash } from "./types.js";

/**
 * Compare two hex hashes lexicographically and return them in sorted order.
 * Ensures deterministic node hashes regardless of left/right child insertion order.
 */
function sortedPair(a: HexHash, b: HexHash): [HexHash, HexHash] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Hash two child nodes using sorted-pair ordering and a 0x01 domain prefix
 * (OpenZeppelin MerkleTree convention).
 */
export function hashSortedPair(a: HexHash, b: HexHash): HexHash {
  const [lo, hi] = sortedPair(a, b);
  const hash = createHash("sha256")
    .update(Buffer.from([0x01]))
    .update(Buffer.from(lo, "hex"))
    .update(Buffer.from(hi, "hex"))
    .digest("hex");
  return asHexHash(hash);
}

/**
 * Hash two child nodes using standard (unsorted) ordering and a 0x01 domain prefix.
 * Preserves left/right semantics when sorted-pair mode is disabled.
 */
export function hashOrderedPair(left: HexHash, right: HexHash): HexHash {
  const hash = createHash("sha256")
    .update(Buffer.from([0x01]))
    .update(Buffer.from(left, "hex"))
    .update(Buffer.from(right, "hex"))
    .digest("hex");
  return asHexHash(hash);
}
