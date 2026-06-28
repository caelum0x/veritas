// Consent proof: cryptographic evidence binding a consent decision to its context.
import { z } from "zod";
import { newId, IsoTimestamp, sha256Hex, canonicalize } from "@veritas/core";
import { type Consent } from "./consent.js";

export type ProofId = string & { readonly __brand: "ProofId" };
export const newProofId = (): ProofId => newId("proof") as unknown as ProofId;

export const ProofAlgorithmSchema = z.enum(["sha256-canonicalize"]);
export type ProofAlgorithm = z.infer<typeof ProofAlgorithmSchema>;

export const ConsentProofSchema = z.object({
  id: z.string(),
  consentId: z.string(),
  userId: z.string(),
  purposeId: z.string(),
  termsVersion: z.string(),
  algorithm: ProofAlgorithmSchema,
  digest: z.string(),
  payload: z.string(),
  issuedAt: z.string(),
});

export type ConsentProof = z.infer<typeof ConsentProofSchema>;

export interface ProofPayload {
  consentId: string;
  userId: string;
  purposeId: string;
  termsVersion: string;
  status: string;
  grantedAt: string | undefined;
  createdAt: string;
}

export function buildProofPayload(consent: Readonly<Consent>): ProofPayload {
  return {
    consentId: consent.id,
    userId: consent.userId,
    purposeId: consent.purposeId,
    termsVersion: consent.termsVersion,
    status: consent.status,
    grantedAt: consent.grantedAt,
    createdAt: consent.createdAt,
  };
}

export function makeConsentProof(
  consent: Readonly<Consent>,
  now: IsoTimestamp
): ConsentProof {
  const payload = buildProofPayload(consent);
  const canonical = canonicalize(payload as unknown as Record<string, unknown>);
  const digest = sha256Hex(canonical);

  return {
    id: newProofId(),
    consentId: consent.id,
    userId: consent.userId,
    purposeId: consent.purposeId,
    termsVersion: consent.termsVersion,
    algorithm: "sha256-canonicalize",
    digest,
    payload: canonical,
    issuedAt: now,
  };
}

export function verifyConsentProof(
  proof: Readonly<ConsentProof>,
  consent: Readonly<Consent>
): boolean {
  const payload = buildProofPayload(consent);
  const canonical = canonicalize(payload as unknown as Record<string, unknown>);
  const expected = sha256Hex(canonical);
  return proof.digest === expected && proof.payload === canonical;
}
