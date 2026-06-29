// Merkle tree builder: constructs a complete binary tree from a list of leaf values.
import { type HexHash, type LeafValue, type MerkleTree, type MerkleTreeOptions, asHexHash } from "./types.js";
import { hashLeaf, hashNode } from "./hash.js";
import { hashSortedPair } from "./sorted-pair.js";
import { EmptyLeavesError } from "./errors.js";

/** Pair two nodes, optionally sorting them before hashing (OZ-style). */
function pairHash(a: HexHash, b: HexHash, sortPairs: boolean): HexHash {
  return sortPairs ? hashSortedPair(a, b) : hashNode(a, b);
}

/**
 * Build a Merkle tree from an array of leaf values.
 * Returns the tree with root, all leaf hashes, and tree depth.
 * Odd layers duplicate the last node to keep the tree balanced.
 */
export function buildTree(leaves: readonly LeafValue[], options: MerkleTreeOptions = {}): MerkleTree {
  if (leaves.length === 0) throw new EmptyLeavesError();

  const sortPairs = options.sortPairs ?? true;
  const leafHashes: HexHash[] = leaves.map(hashLeaf);

  if (leafHashes.length === 1) {
    return { root: leafHashes[0]!, leafHashes, depth: 0 };
  }

  let currentLayer: HexHash[] = leafHashes;
  let depth = 0;

  while (currentLayer.length > 1) {
    const nextLayer: HexHash[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i]!;
      const right = currentLayer[i + 1] ?? left; // duplicate last if odd
      nextLayer.push(pairHash(left, right, sortPairs));
    }
    currentLayer = nextLayer;
    depth += 1;
  }

  return { root: asHexHash(currentLayer[0]!), leafHashes, depth };
}
