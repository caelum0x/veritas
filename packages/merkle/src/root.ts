// Root computation: derive the Merkle root directly from an array of leaf hashes.
import { type HexHash, type LeafValue, type MerkleTreeOptions, asHexHash } from "./types.js";
import { hashLeaf, hashNode } from "./hash.js";
import { hashSortedPair } from "./sorted-pair.js";
import { EmptyLeavesError } from "./errors.js";

/**
 * Compute the Merkle root from a list of raw leaf values.
 * Hashes leaves with 0x00 domain prefix and folds up the tree.
 */
export function computeRoot(leaves: readonly LeafValue[], options: MerkleTreeOptions = {}): HexHash {
  if (leaves.length === 0) throw new EmptyLeavesError();
  return computeRootFromHashes(leaves.map(hashLeaf), options);
}

/**
 * Compute the Merkle root from pre-hashed leaf hashes.
 * Useful when leaf hashes are already available (e.g., from batchHashLeaves).
 */
export function computeRootFromHashes(
  leafHashes: readonly HexHash[],
  options: MerkleTreeOptions = {},
): HexHash {
  if (leafHashes.length === 0) throw new EmptyLeavesError();
  const sortPairs = options.sortPairs ?? true;

  let currentLayer: HexHash[] = leafHashes.slice() as HexHash[];

  while (currentLayer.length > 1) {
    const nextLayer: HexHash[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i]!;
      const right = currentLayer[i + 1] ?? left;
      nextLayer.push(sortPairs ? hashSortedPair(left, right) : hashNode(left, right));
    }
    currentLayer = nextLayer;
  }

  return asHexHash(currentLayer[0]!);
}
