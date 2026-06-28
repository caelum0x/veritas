// Commit/reveal scheme: produce a blinded commitment, later open to reveal the preimage.
import { randomHex, sha256Hex } from "@veritas/crypto";
import { canonicalize } from "@veritas/core";

/** A blinded commitment binding a value to a random nonce. */
export interface Commitment {
  readonly commitment: string;
  readonly nonce: string;
  readonly valueHash: string;
  readonly createdAt: number;
}

/** The revealed opening of a commitment. */
export interface CommitmentOpening {
  readonly commitment: string;
  readonly nonce: string;
  readonly value: unknown;
}

/**
 * Commit to an arbitrary JSON-serialisable value.
 * commitment = SHA-256(nonce || valueHash)
 */
export function commit(value: unknown): Commitment {
  const nonce = randomHex(32);
  const valueHash = sha256Hex(canonicalize(value));
  const commitment = sha256Hex(nonce + valueHash);
  return { commitment, nonce, valueHash, createdAt: Date.now() };
}

/**
 * Produce an opening for a prior commitment, binding the original value.
 */
export function open(commitment: Commitment, value: unknown): CommitmentOpening {
  return { commitment: commitment.commitment, nonce: commitment.nonce, value };
}

/**
 * Verify that an opening is consistent with the commitment.
 * Returns true iff the value hashes correctly and recomputed commitment matches.
 */
export function verifyCommitment(opening: CommitmentOpening): boolean {
  try {
    const valueHash = sha256Hex(canonicalize(opening.value));
    const recomputed = sha256Hex(opening.nonce + valueHash);
    return recomputed === opening.commitment;
  } catch {
    return false;
  }
}
