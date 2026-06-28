// Domain errors for @veritas/merkle operations.
import { AppError } from "@veritas/core";

export class MerkleError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
  }
}

export class EmptyLeavesError extends MerkleError {
  constructor() {
    super("Cannot build a Merkle tree from an empty leaf set.");
  }
}

export class InvalidProofError extends MerkleError {
  constructor(reason?: string) {
    super(reason != null ? `Invalid Merkle proof: ${reason}` : "Invalid Merkle proof.");
  }
}

export class LeafNotFoundError extends MerkleError {
  constructor(leaf: string) {
    super(`Leaf not found in tree: ${leaf}`);
  }
}

export class MalformedProofError extends MerkleError {
  constructor(field: string) {
    super(`Malformed proof data: missing or invalid field '${field}'.`);
  }
}
