// Shared type definitions for the identity module: agent identities, keys, links.
import { z } from "zod";
import type { Did } from "@veritas/did";
import type { IsoTimestamp } from "@veritas/core";

/** Branded agent identity ID. */
export type AgentIdentityId = string & { readonly __brand: "AgentIdentityId" };

/** Cast a plain string to AgentIdentityId (no runtime validation). */
export function asAgentIdentityId(s: string): AgentIdentityId {
  return s as AgentIdentityId;
}

/** Supported signing key algorithms in the identity module. */
export type IdentityKeyAlgorithm = "Ed25519";

/** A single signing key managed for an agent identity. */
export interface AgentSigningKey {
  readonly keyId: string;
  readonly algorithm: IdentityKeyAlgorithm;
  /** Hex-encoded public key bytes. */
  readonly publicKeyHex: string;
  readonly createdAt: IsoTimestamp;
  readonly revokedAt?: IsoTimestamp;
  readonly isCurrent: boolean;
}

/** The full agent identity record stored in the registry. */
export interface AgentIdentity {
  readonly id: AgentIdentityId;
  readonly did: Did;
  readonly displayName?: string;
  readonly keys: readonly AgentSigningKey[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly deactivated: boolean;
}

/** A wallet address linked to an agent DID. */
export type WalletAddress = string & { readonly __brand: "WalletAddress" };

/** Cast a plain string to WalletAddress. */
export function asWalletAddress(s: string): WalletAddress {
  return s as WalletAddress;
}

/** Record of a verified wallet<->agent DID link. */
export interface WalletAgentLink {
  readonly walletAddress: WalletAddress;
  readonly agentDid: Did;
  readonly linkedAt: IsoTimestamp;
  /** The CAIP-2 chain id on which ownership was proven (e.g. "eip155:8453"). */
  readonly chainId: string;
  readonly proofType: "eip191" | "eip712";
}

/** Proof of control payload signed by the agent to prove key ownership. */
export interface ProofOfControl {
  readonly challenge: string;
  readonly did: Did;
  readonly keyId: string;
  /** Base64url-encoded signature over the challenge. */
  readonly signatureB64: string;
  readonly issuedAt: IsoTimestamp;
}

/** Zod schema for runtime validation of ProofOfControl objects. */
export const proofOfControlSchema = z.object({
  challenge: z.string().min(1),
  did: z.string().startsWith("did:"),
  keyId: z.string().min(1),
  signatureB64: z.string().min(1),
  issuedAt: z.string().datetime(),
});

/** Request to link a wallet address to an agent DID. */
export interface LinkWalletRequest {
  readonly walletAddress: WalletAddress;
  readonly agentDid: Did;
  readonly chainId: string;
  readonly proofType: "eip191" | "eip712";
  /** Hex-encoded signature over the linking message. */
  readonly signatureHex: string;
  /** The original message that was signed. */
  readonly message: string;
}

/** Zod schema for runtime validation of LinkWalletRequest. */
export const linkWalletRequestSchema = z.object({
  walletAddress: z.string().min(1),
  agentDid: z.string().startsWith("did:"),
  chainId: z.string().min(1),
  proofType: z.enum(["eip191", "eip712"]),
  signatureHex: z.string().min(1),
  message: z.string().min(1),
});

/** Key rotation event log entry. */
export interface KeyRotationEvent {
  readonly did: import("@veritas/did").Did;
  readonly oldKeyId: string;
  readonly newKeyId: string;
  readonly rotatedAt: IsoTimestamp;
  readonly reason?: string;
}
