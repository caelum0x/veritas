// Verify proofs: PoV integrity, Merkle inclusion, hash commitments, and transcripts.
import { verifyProof as merkleVerifyProof, deserializeProof } from "@veritas/merkle";
import { canonicalize, epochToIso, type IsoTimestamp } from "@veritas/core";
import { sha256Hex } from "@veritas/crypto";
import { verifyPoV } from "./proof-of-verification.js";
import { verifyHashCommitment, type HashCommitmentReveal } from "./hash-commit.js";
import { verifyCommitment, type CommitmentOpening } from "./commitment.js";
import { verifyTranscript } from "./transcript.js";
import type {
  AnyProofEnvelope,
  PoVEnvelope,
  MerkleEnvelope,
  ProofVerificationResult,
  ProofTranscript,
} from "./types.js";
import type { ProofOfVerification } from "./proof-of-verification.js";

/** Verify a PoV envelope's internal integrity. */
function verifyPoVEnvelope(envelope: PoVEnvelope): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  const { payload } = envelope;

  // Recompute dataHash over the payload fields that were committed
  const committed = {
    subject: {
      claimId: payload.claimId,
      agentId: payload.agentId,
      reportId: payload.reportId,
    },
    data: {
      verdict: payload.verdict,
      score: payload.score,
      reportContentHash: payload.reportContentHash,
      nonce: payload.nonce,
    },
    nonce: payload.nonce,
  };
  const expected = sha256Hex(canonicalize(committed));
  const valid = expected === payload.dataHash;

  return {
    valid,
    proofId: envelope.id,
    kind: envelope.kind,
    checkedAt,
    reason: valid ? null : "dataHash mismatch",
  };
}

/** Verify a Merkle inclusion envelope. */
function verifyMerkleEnvelope(envelope: MerkleEnvelope): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  try {
    const { proof, root, leafHash, leafIndex } = envelope.payload;
    const deserialized = deserializeProof(proof);
    const valid = merkleVerifyProof(deserialized);
    const rootMatch = deserialized.root === root;
    const leafMatch = deserialized.leafHash === leafHash && deserialized.leafIndex === leafIndex;
    const overall = valid && rootMatch && leafMatch;
    return {
      valid: overall,
      proofId: envelope.id,
      kind: envelope.kind,
      checkedAt,
      reason: overall ? null : "Merkle proof invalid or root/leaf mismatch",
    };
  } catch (e) {
    return {
      valid: false,
      proofId: envelope.id,
      kind: envelope.kind,
      checkedAt,
      reason: e instanceof Error ? e.message : "unknown error",
    };
  }
}

/** Dispatch verification for any proof envelope. */
export function verifyEnvelope(envelope: AnyProofEnvelope): ProofVerificationResult {
  switch (envelope.kind) {
    case "proof-of-verification":
      return verifyPoVEnvelope(envelope);
    case "merkle-inclusion":
      return verifyMerkleEnvelope(envelope);
  }
}

/** Verify a raw ProofOfVerification struct. */
export function verifyProofOfVerification(pov: ProofOfVerification): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  const valid = verifyPoV(pov);
  return {
    valid,
    proofId: pov.id,
    kind: "proof-of-verification",
    checkedAt,
    reason: valid ? null : "PoV dataHash mismatch",
  };
}

/** Verify a hash commitment reveal. */
export function verifyHashCommitmentReveal(
  reveal: HashCommitmentReveal
): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  const valid = verifyHashCommitment(reveal);
  return {
    valid,
    proofId: reveal.id,
    kind: "hash-commitment",
    checkedAt,
    reason: valid ? null : "hash commitment mismatch",
  };
}

/** Verify a generic commit-reveal opening. */
export function verifyCommitmentOpening(
  id: string,
  opening: CommitmentOpening
): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  const valid = verifyCommitment(opening);
  return {
    valid,
    proofId: id,
    kind: "challenge-response",
    checkedAt,
    reason: valid ? null : "commitment opening invalid",
  };
}

/** Verify a finalized proof transcript. */
export function verifyProofTranscript(transcript: ProofTranscript): ProofVerificationResult {
  const checkedAt = epochToIso(Date.now());
  const valid = verifyTranscript(transcript);
  return {
    valid,
    proofId: transcript.id,
    kind: "challenge-response",
    checkedAt,
    reason: valid ? null : "transcript rootHash mismatch",
  };
}
