// Multiproof generation and verification for multiple leaves in a single proof structure.
import { HexHash, MerkleTree, MultiProof, MultiProofRequest, asHexHash } from "./types.js";
import { hashSortedPair, hashOrderedPair } from "./sorted-pair.js";
import { LeafNotFoundError, InvalidProofError, EmptyLeavesError } from "./errors.js";

/**
 * Build the full layer array for a balanced Merkle tree from its leaf hashes.
 * layers[0] = leaves, layers[n-1] = [root].
 */
function buildLayers(
  leafHashes: readonly HexHash[],
  sortPairs: boolean,
): ReadonlyArray<readonly HexHash[]> {
  if (leafHashes.length === 0) {
    throw new EmptyLeavesError();
  }
  const layers: Array<readonly HexHash[]> = [leafHashes];
  let current = leafHashes;
  while (current.length > 1) {
    const next: HexHash[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i] as HexHash;
      const right = i + 1 < current.length ? (current[i + 1] as HexHash) : left;
      next.push(sortPairs ? hashSortedPair(left, right) : hashOrderedPair(left, right));
    }
    layers.push(next);
    current = next;
  }
  return layers;
}

/**
 * Generate an OpenZeppelin-compatible multiproof for a set of leaf indices.
 * The resulting proof contains the minimal set of sibling hashes needed to
 * reconstruct the root and the flags array indicating when to consume a proof
 * hash vs. a queue hash.
 */
export function generateMultiProof(
  tree: MerkleTree,
  request: MultiProofRequest,
  sortPairs = true,
): MultiProof {
  const { leafHashes } = tree;
  if (leafHashes.length === 0) {
    throw new EmptyLeavesError();
  }

  const { leafIndices } = request;
  for (const idx of leafIndices) {
    if (idx < 0 || idx >= leafHashes.length) {
      throw new LeafNotFoundError(String(idx));
    }
  }

  const layers = buildLayers(leafHashes, sortPairs);

  // Track which nodes are "known" (provable from the leaf set) at each layer.
  const knownSets: Set<number>[] = layers.map(() => new Set<number>());
  for (const idx of leafIndices) {
    knownSets[0]!.add(idx);
  }

  const siblings: HexHash[] = [];
  const flags: boolean[] = [];

  for (let d = 0; d < layers.length - 1; d++) {
    const layer = layers[d]!;
    const known = knownSets[d]!;
    const nextKnown = knownSets[d + 1]!;

    // Process pairs in order.
    const visited = new Set<number>();
    for (const nodeIdx of Array.from(known).sort((a, b) => a - b)) {
      if (visited.has(nodeIdx)) continue;
      const siblingIdx = nodeIdx % 2 === 0 ? nodeIdx + 1 : nodeIdx - 1;
      const parentIdx = Math.floor(nodeIdx / 2);
      nextKnown.add(parentIdx);

      if (known.has(siblingIdx)) {
        // Both children are known; no sibling needed — flag true means "use queue".
        flags.push(true);
        visited.add(nodeIdx);
        visited.add(siblingIdx);
      } else {
        // Sibling is external; add it to proof — flag false means "use proof array".
        flags.push(false);
        const sibHash =
          siblingIdx < layer.length ? (layer[siblingIdx] as HexHash) : (layer[nodeIdx] as HexHash);
        siblings.push(sibHash);
        visited.add(nodeIdx);
      }
    }
  }

  const proofLeafHashes = leafIndices.map((i) => leafHashes[i] as HexHash);

  return {
    root: tree.root,
    leafHashes: proofLeafHashes,
    leafIndices: [...leafIndices],
    siblings,
    flags,
  };
}

/**
 * Verify that a MultiProof is valid against the given root.
 * Returns true when the proof correctly reconstructs the root.
 */
export function verifyMultiProof(proof: MultiProof, sortPairs = true): boolean {
  const { root, leafHashes, siblings, flags } = proof;

  if (leafHashes.length === 0) {
    throw new InvalidProofError("leaf set is empty");
  }

  // Reconstruct root using queue + sibling array, following OZ multiproof algorithm.
  const queue: HexHash[] = [...leafHashes];
  let siblingIdx = 0;

  for (const usesQueue of flags) {
    const left = queue.shift();
    if (left == null) {
      return false;
    }
    let right: HexHash;
    if (usesQueue) {
      const fromQueue = queue.shift();
      if (fromQueue == null) {
        return false;
      }
      right = fromQueue;
    } else {
      const fromProof = siblings[siblingIdx++];
      if (fromProof == null) {
        return false;
      }
      right = fromProof;
    }
    const parent = sortPairs ? hashSortedPair(left, right) : hashOrderedPair(left, right);
    queue.push(parent);
  }

  if (queue.length !== 1) {
    return false;
  }
  return queue[0] === root;
}
