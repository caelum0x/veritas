// Core W3C Verifiable Credentials data model types and branded identifiers.
import { z } from "zod";
import type { IsoTimestamp, ContentHash, Score, Verdict } from "@veritas/core";
import type { Did } from "@veritas/did";

/** Branded VC identifier. */
export type VcId = string & { readonly __brand: "VcId" };
export const newVcId = (): VcId => `vc:veritas:${Date.now()}-${Math.random().toString(36).slice(2)}` as VcId;

/** Branded Verifiable Presentation identifier. */
export type VpId = string & { readonly __brand: "VpId" };
export const newVpId = (): VpId => `vp:veritas:${Date.now()}-${Math.random().toString(36).slice(2)}` as VpId;

/** W3C VC proof object (JWS-based). */
export interface VcProof {
  readonly type: string;
  readonly created: IsoTimestamp;
  readonly verificationMethod: string;
  readonly proofPurpose: string;
  readonly jws: string;
}

/** W3C VC status entry for revocation. */
export interface VcStatus {
  readonly id: string;
  readonly type: string;
  readonly statusListIndex: string;
  readonly statusListCredential: string;
}

/** Generic W3C Verifiable Credential structure. */
export interface VerifiableCredential<S = Record<string, unknown>> {
  readonly "@context": readonly string[];
  readonly id: VcId;
  readonly type: readonly string[];
  readonly issuer: Did | { readonly id: Did; readonly name?: string };
  readonly issuanceDate: IsoTimestamp;
  readonly expirationDate?: IsoTimestamp;
  readonly credentialSubject: S & { readonly id?: Did };
  readonly credentialStatus?: VcStatus;
  readonly proof?: VcProof;
}

/** Generic W3C Verifiable Presentation structure. */
export interface VerifiablePresentation {
  readonly "@context": readonly string[];
  readonly id: VpId;
  readonly type: readonly string[];
  readonly holder?: Did;
  readonly verifiableCredential: readonly VerifiableCredential[];
  readonly proof?: VcProof;
}

/** Credential subject for a VerificationReport VC. */
export interface VerificationCredentialSubject {
  readonly id?: Did;
  readonly reportId: string;
  readonly verificationId: string;
  readonly contentHash: ContentHash;
  readonly trustScore: Score;
  readonly verdict: Verdict;
  readonly claimCount: number;
  readonly sourceCount: number;
  readonly model: string;
  readonly verifierVersion: string;
  readonly issuedAt: IsoTimestamp;
}

/** A signed VC wrapping a VerificationReport. */
export type VerificationVerifiableCredential = VerifiableCredential<VerificationCredentialSubject>;

/** Zod schema for VcProof. */
export const VcProofSchema = z.object({
  type: z.string(),
  created: z.string(),
  verificationMethod: z.string(),
  proofPurpose: z.string(),
  jws: z.string(),
});

/** Zod schema for VcStatus. */
export const VcStatusSchema = z.object({
  id: z.string().url(),
  type: z.string(),
  statusListIndex: z.string(),
  statusListCredential: z.string().url(),
});

/** Zod schema for VerificationCredentialSubject. */
export const VerificationCredentialSubjectSchema = z.object({
  id: z.string().optional(),
  reportId: z.string(),
  verificationId: z.string(),
  contentHash: z.string(),
  trustScore: z.number().min(0).max(1),
  verdict: z.enum(["SUPPORTED", "REFUTED", "UNVERIFIABLE"]),
  claimCount: z.number().int().min(0),
  sourceCount: z.number().int().min(0),
  model: z.string(),
  verifierVersion: z.string(),
  issuedAt: z.string(),
});
