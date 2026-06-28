// Batch leaf hashing: hash many leaf values into HexHash[] in a single pass.
import { hashLeaf } from "./hash.js";
import { HexHash, LeafValue, asHexHash } from "./types.js";
import { EmptyLeavesError } from "./errors.js";

/**
 * Hash a single LeafValue into a HexHash.
 * Delegates to hashLeaf which applies the 0x00 domain-separation prefix.
 */
export function hashLeafValue(leaf: LeafValue): HexHash {
  return asHexHash(hashLeaf(leaf as Buffer | Uint8Array | string));
}

/**
 * Hash an array of leaf values into an array of HexHash values.
 * Throws EmptyLeavesError when the array is empty.
 */
export function batchHashLeaves(leaves: readonly LeafValue[]): readonly HexHash[] {
  if (leaves.length === 0) {
    throw new EmptyLeavesError();
  }
  return leaves.map(hashLeafValue);
}

/**
 * Chunk an array of hashes into groups of `size`.
 * The last chunk may be smaller than `size`.
 */
export function chunkHashes(
  hashes: readonly HexHash[],
  size: number,
): ReadonlyArray<readonly HexHash[]> {
  const result: Array<readonly HexHash[]> = [];
  for (let i = 0; i < hashes.length; i += size) {
    result.push(hashes.slice(i, i + size));
  }
  return result;
}

/**
 * Pad a list of hashes to the next power of two by duplicating the last element.
 * Returns the input unchanged if already a power of two.
 */
export function padToPowerOfTwo(hashes: readonly HexHash[]): readonly HexHash[] {
  const len = hashes.length;
  if (len === 0) {
    throw new EmptyLeavesError();
  }
  let target = 1;
  while (target < len) target <<= 1;
  if (target === len) return hashes;
  const last = hashes[len - 1] as HexHash;
  const padded = [...hashes];
  while (padded.length < target) {
    padded.push(last);
  }
  return padded;
}
