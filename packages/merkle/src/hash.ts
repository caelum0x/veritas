// Leaf and internal node hashing for Merkle trees using SHA-256 with domain separation.
import { createHash } from "node:crypto";
import { type HexHash, asHexHash } from "./types.js";

/** Domain-separation prefix for leaf nodes (OpenZeppelin convention). */
const LEAF_PREFIX = Buffer.from([0x00]);

/** Domain-separation prefix for internal nodes (OpenZeppelin convention). */
const NODE_PREFIX = Buffer.from([0x01]);

/** Hash a raw leaf value with 0x00 domain separation prefix. */
export function hashLeaf(data: string | Uint8Array | Buffer): HexHash {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  const hex = createHash("sha256").update(LEAF_PREFIX).update(buf).digest("hex");
  return asHexHash(hex);
}

/** Hash two child hashes together as an internal node with 0x01 domain separation. */
export function hashNode(left: HexHash, right: HexHash): HexHash {
  const l = Buffer.from(left, "hex");
  const r = Buffer.from(right, "hex");
  const hex = createHash("sha256").update(NODE_PREFIX).update(l).update(r).digest("hex");
  return asHexHash(hex);
}
