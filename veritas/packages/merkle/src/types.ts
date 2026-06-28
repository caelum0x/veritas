// Core types for the @veritas/merkle module: leaves, nodes, proofs, and tree structures.

/** A hex-encoded 32-byte hash value. */
export type HexHash = string & { readonly __brand: "HexHash" };

/** Cast a plain hex string to HexHash (caller must ensure correctness). */
export function asHexHash(h: string): HexHash {
  return h as HexHash;
}

/** A single leaf value before hashing — arbitrary bytes or a hex string. */
export type LeafValue = string | Uint8Array | Buffer;

/** Direction for a sibling in an inclusion proof. */
export type ProofSide = "left" | "right";

/** A single step in a Merkle inclusion proof. */
export interface ProofStep {
  readonly sibling: HexHash;
  readonly side: ProofSide;
}

/** A Merkle inclusion proof for a single leaf. */
export interface MerkleProof {
  readonly leafIndex: number;
  readonly leafHash: HexHash;
  readonly steps: readonly ProofStep[];
  readonly root: HexHash;
}

/** A node in the Merkle tree (internal representation). */
export interface MerkleNode {
  readonly hash: HexHash;
  readonly left?: MerkleNode;
  readonly right?: MerkleNode;
}

/** A built Merkle tree with its root and leaf hashes. */
export interface MerkleTree {
  readonly root: HexHash;
  readonly leafHashes: readonly HexHash[];
  readonly depth: number;
}

/** A serialized proof suitable for JSON transport. */
export interface SerializedProof {
  readonly version: 1;
  readonly root: string;
  readonly leafIndex: number;
  readonly leafHash: string;
  readonly steps: ReadonlyArray<{ sibling: string; side: ProofSide }>;
}

/** Input for multiproof generation: indices of leaves to prove. */
export interface MultiProofRequest {
  readonly leafIndices: readonly number[];
}

/** A multiproof covering multiple leaves. */
export interface MultiProof {
  readonly root: HexHash;
  readonly leafHashes: readonly HexHash[];
  readonly leafIndices: readonly number[];
  readonly siblings: readonly HexHash[];
  readonly flags: readonly boolean[];
}

/** Options for building a Merkle tree. */
export interface MerkleTreeOptions {
  /** Whether to sort leaf pairs before hashing (OpenZeppelin-style). Default: true. */
  readonly sortPairs?: boolean;
}
