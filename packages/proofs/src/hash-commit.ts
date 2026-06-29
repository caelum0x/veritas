// Hash commitment: bind a content hash to a timestamp without revealing the full artifact.
import { sha256Hex } from "@veritas/crypto";
import { randomHex } from "@veritas/crypto";

/** A hash-based commitment tying a content hash to a blinded salt. */
export interface HashCommitment {
  readonly id: string;
  readonly commitment: string;
  readonly salt: string;
  readonly contentHash: string;
  readonly algorithm: "sha256";
  readonly timestamp: number;
}

/** Reveal envelope for a hash commitment. */
export interface HashCommitmentReveal {
  readonly id: string;
  readonly commitment: string;
  readonly salt: string;
  readonly contentHash: string;
}

/**
 * Commit to a content hash without revealing the hash itself.
 * commitment = SHA-256(salt || contentHash)
 */
export function commitHash(id: string, contentHash: string): HashCommitment {
  const salt = randomHex(32);
  const commitment = sha256Hex(salt + contentHash);
  return {
    id,
    commitment,
    salt,
    contentHash,
    algorithm: "sha256",
    timestamp: Date.now(),
  };
}

/**
 * Build a reveal envelope from a prior HashCommitment.
 */
export function revealHash(hc: HashCommitment): HashCommitmentReveal {
  return { id: hc.id, commitment: hc.commitment, salt: hc.salt, contentHash: hc.contentHash };
}

/**
 * Verify a hash commitment reveal.
 * Returns true iff SHA-256(salt || contentHash) === commitment.
 */
export function verifyHashCommitment(reveal: HashCommitmentReveal): boolean {
  try {
    const recomputed = sha256Hex(reveal.salt + reveal.contentHash);
    return recomputed === reveal.commitment;
  } catch {
    return false;
  }
}
