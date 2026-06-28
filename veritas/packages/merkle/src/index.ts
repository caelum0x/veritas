// Public surface of @veritas/merkle: Merkle tree construction, proofs, and verification.

export type {
  HexHash,
  LeafValue,
  ProofSide,
  ProofStep,
  MerkleProof,
  MerkleNode,
  MerkleTree,
  SerializedProof,
  MultiProofRequest,
  MultiProof,
  MerkleTreeOptions,
} from "./types.js";

export { asHexHash } from "./types.js";
export { hashLeaf, hashNode } from "./hash.js";
export { buildTree } from "./tree.js";
export { generateProof } from "./proof.js";
export { verifyProof } from "./verify.js";
export { computeRoot } from "./root.js";
export { batchHashLeaves } from "./batch.js";
export { hashSortedPair } from "./sorted-pair.js";
export { serializeProof, deserializeProof } from "./serialize.js";
export { generateMultiProof, verifyMultiProof } from "./multiproof.js";
export {
  MerkleError,
  EmptyLeavesError,
  InvalidProofError,
  LeafNotFoundError,
} from "./errors.js";
