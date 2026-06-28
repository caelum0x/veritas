// Inclusion proof generation: derive a sibling-path proof for a leaf at a given index.
import { type HexHash, type MerkleProof, type MerkleTree, type MerkleTreeOptions, type ProofSide, asHexHash } from "./types.js";
import { hashSortedPair } from "./sorted-pair.js";
import { hashNode } from "./hash.js";
import { LeafNotFoundError } from "./errors.js";

/**
 * Generate an inclusion proof for the leaf at `leafIndex` in the given tree.
 * Walks up the layer-by-layer structure, collecting sibling hashes at each level.
 */
export function generateProof(tree: MerkleTree, leafIndex: number, options: MerkleTreeOptions = {}): MerkleProof {
  const sortPairs = options.sortPairs ?? true;
  const { leafHashes } = tree;

  if (leafIndex < 0 || leafIndex >= leafHashes.length) {
    throw new LeafNotFoundError(String(leafIndex));
  }

  if (leafHashes.length === 1) {
    return {
      leafIndex,
      leafHash: leafHashes[0]!,
      steps: [],
      root: tree.root,
    };
  }

  // Rebuild layers so we can walk sibling paths.
  const layers: HexHash[][] = [leafHashes.slice() as HexHash[]];
  let currentLayer = layers[0]!;

  while (currentLayer.length > 1) {
    const nextLayer: HexHash[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i]!;
      const right = currentLayer[i + 1] ?? left;
      nextLayer.push(sortPairs ? hashSortedPair(left, right) : hashNode(left, right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const steps: Array<{ sibling: HexHash; side: ProofSide }> = [];
  let idx = leafIndex;

  for (let d = 0; d < layers.length - 1; d++) {
    const layer = layers[d]!;
    const isRightNode = idx % 2 === 1;
    const siblingIdx = isRightNode ? idx - 1 : Math.min(idx + 1, layer.length - 1);
    const sibling = asHexHash(layer[siblingIdx]!);
    const side: ProofSide = isRightNode ? "left" : "right";
    steps.push({ sibling, side });
    idx = Math.floor(idx / 2);
  }

  return {
    leafIndex,
    leafHash: leafHashes[leafIndex]!,
    steps,
    root: tree.root,
  };
}
