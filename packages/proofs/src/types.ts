// Shared types for the @veritas/proofs module.
import type { IsoTimestamp, ContentHash } from "@veritas/core";
import type { MerkleProof, SerializedProof } from "@veritas/merkle";

/** Supported proof kinds in the system. */
export type ProofKind =
  | "proof-of-verification"
  | "hash-commitment"
  | "merkle-inclusion"
  | "challenge-response";

/** A generic sealed proof envelope wrapping any proof payload. */
export interface ProofEnvelope<K extends ProofKind, P> {
  readonly kind: K;
  readonly id: string;
  readonly version: 1;
  readonly payload: P;
  readonly createdAt: IsoTimestamp;
}

/** Payload for a Merkle-inclusion proof over a report's evidence leaves. */
export interface MerkleInclusionPayload {
  readonly reportId: string;
  readonly root: string;
  readonly leafIndex: number;
  readonly leafHash: string;
  readonly proof: SerializedProof;
  readonly evidenceHashes: readonly string[];
}

/** A PoV proof envelope referencing the structured PoV from proof-of-verification.ts. */
export interface PoVPayload {
  readonly claimId: string;
  readonly agentId: string;
  readonly reportId: string;
  readonly verdict: string;
  readonly score: number;
  readonly reportContentHash: ContentHash;
  readonly dataHash: string;
  readonly nonce: string;
}

/** Envelope for a PoV proof. */
export type PoVEnvelope = ProofEnvelope<"proof-of-verification", PoVPayload>;

/** Envelope for a Merkle inclusion proof. */
export type MerkleEnvelope = ProofEnvelope<"merkle-inclusion", MerkleInclusionPayload>;

/** Union of all concrete proof envelopes. */
export type AnyProofEnvelope = PoVEnvelope | MerkleEnvelope;

/** Transcript message: a label plus an associated data hash. */
export interface TranscriptMessage {
  readonly label: string;
  readonly dataHash: string;
  readonly sequenceNumber: number;
}

/** A sealed transcript of messages committed in order. */
export interface ProofTranscript {
  readonly id: string;
  readonly messages: readonly TranscriptMessage[];
  readonly rootHash: string;
  readonly createdAt: IsoTimestamp;
  readonly finalizedAt: IsoTimestamp | null;
}

/** A Fiat-Shamir-style challenge derived from a transcript. */
export interface FiatShamirChallenge {
  readonly transcriptId: string;
  readonly challenge: string;
  readonly transcriptRootHash: string;
  readonly createdAt: IsoTimestamp;
}

/** Result of verifying a single proof. */
export interface ProofVerificationResult {
  readonly valid: boolean;
  readonly proofId: string;
  readonly kind: ProofKind;
  readonly checkedAt: IsoTimestamp;
  readonly reason: string | null;
}

/** Encoded binary/hex representation of a proof for transport. */
export interface EncodedProof {
  readonly encoding: "hex" | "base64";
  readonly data: string;
  readonly proofId: string;
  readonly kind: ProofKind;
}
