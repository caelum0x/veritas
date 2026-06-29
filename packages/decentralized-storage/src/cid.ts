// CIDv1-like content identifier: multibase-prefixed, multihash-encoded address.

import { sha256Hex } from "@veritas/core";

/** A CIDv1-like string: "bafk:<sha256hex>" (base32/base58 elided for zero-dep impl). */
export type CID = `bafk:${string}`;

/** Codec labels for supported block encodings. */
export type Codec = "raw" | "dag-json" | "dag-cbor";

/** Create a deterministic CID from raw content bytes and an optional codec tag. */
export function makeCid(content: Uint8Array, codec: Codec = "raw"): CID {
  const hex = sha256Hex(content);
  // Embed codec in the identifier so the same bytes under different codecs differ.
  const encoded = codec === "raw" ? hex : `${codec}:${hex}`;
  return `bafk:${encoded}` as CID;
}

/** Parse a CID string, returning null if invalid. */
export function parseCid(raw: string): CID | null {
  if (/^bafk:[0-9a-f:a-z-]{64,}$/.test(raw)) return raw as CID;
  return null;
}

/** Extract the hex digest portion from a CID. */
export function cidToHex(cid: CID): string {
  const body = cid.slice("bafk:".length);
  return body.includes(":") ? (body.split(":")[1] ?? body) : body;
}

/** Validate that a string looks like a valid CID produced by this module. */
export function isCid(value: unknown): value is CID {
  return typeof value === "string" && value.startsWith("bafk:") && value.length >= 69;
}
