// Verify a Merkle inclusion proof against a known root hash.
import { type MerkleProof, type MerkleTreeOptions } from "./types.js";
import { hashSortedPair } from "./sorted-pair.js";
import { hashNode } from "./hash.js";
import { InvalidProofError } from "./errors.js";

/**
 * Verify that a MerkleProof is valid against its declared root.
 * Returns true when the recomputed root matches; throws InvalidProofError otherwise.
 */
export function verifyProof(proof: MerkleProof, options: MerkleTreeOptions = {}): boolean {
  const sortPairs = options.sortPairs ?? true;
  let current = proof.leafHash;

  for (const step of proof.steps) {
    if (sortPairs) {
      current = hashSortedPair(current, step.sibling);
    } else {
      const [left, right] = step.side === "left"
        ? [step.sibling, current]
        : [current, step.sibling];
      current = hashNode(left, right);
    }
  }

  if (current !== proof.root) {
    throw new InvalidProofError(
      `recomputed root ${current} does not match expected root ${proof.root}`
    );
  }

  return true;
}

/**
 * Like verifyProof but returns a boolean instead of throwing.
 * Useful for defensive checks where errors should not propagate.
 */
export function isValidProof(proof: MerkleProof, options: MerkleTreeOptions = {}): boolean {
  try {
    return verifyProof(proof, options);
  } catch {
    return false;
  }
}
