// Proof-of-Verification (PoV): a structured attestation binding a verification report to its evidence.
import { sha256Hex } from "@veritas/crypto";
import { canonicalize, type ContentHash, type IsoTimestamp } from "@veritas/core";

/** Identifies the claim and the verifying agent. */
export interface PoVSubject {
  readonly claimId: string;
  readonly agentId: string;
  readonly reportId: string;
}

/** Core data fields committed in the PoV. */
export interface PoVData {
  readonly verdict: string;
  readonly score: number;
  readonly evidenceHashes: readonly string[];
  readonly modelId: string;
  readonly reportContentHash: ContentHash;
}

/** A complete Proof-of-Verification record. */
export interface ProofOfVerification {
  readonly id: string;
  readonly version: 1;
  readonly subject: PoVSubject;
  readonly data: PoVData;
  readonly dataHash: string;
  readonly createdAt: IsoTimestamp;
  readonly nonce: string;
}

/** Minimal input needed to create a PoV. */
export interface CreatePoVInput {
  readonly id: string;
  readonly subject: PoVSubject;
  readonly data: PoVData;
  readonly nonce: string;
  readonly createdAt: IsoTimestamp;
}

/**
 * Build a ProofOfVerification from its constituent parts.
 * The dataHash commits to the canonical JSON of (subject + data + nonce).
 */
export function createPoV(input: CreatePoVInput): ProofOfVerification {
  const payload = { subject: input.subject, data: input.data, nonce: input.nonce };
  const dataHash = sha256Hex(canonicalize(payload));
  return {
    id: input.id,
    version: 1,
    subject: input.subject,
    data: input.data,
    dataHash,
    createdAt: input.createdAt,
    nonce: input.nonce,
  };
}

/**
 * Verify the integrity of a PoV by recomputing its dataHash.
 */
export function verifyPoV(pov: ProofOfVerification): boolean {
  try {
    const payload = { subject: pov.subject, data: pov.data, nonce: pov.nonce };
    const expected = sha256Hex(canonicalize(payload));
    return expected === pov.dataHash;
  } catch {
    return false;
  }
}
