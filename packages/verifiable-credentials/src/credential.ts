// W3C Verifiable Credential data model types and constructors (VC Data Model 1.1).
import { z } from "zod";
import type { IsoTimestamp, ContentHash } from "@veritas/core";
import { newId, isoTimestampSchema, contentHashSchema } from "@veritas/core";
import type { Did } from "@veritas/did";

/** Supported VC context URLs. */
export const VC_CONTEXT_V1 = "https://www.w3.org/2018/credentials/v1" as const;
export const VERITAS_VC_CONTEXT = "https://veritas.network/credentials/v1" as const;

/** VC type identifier constants. */
export const VC_TYPE = "VerifiableCredential" as const;

/** Unique identifier brand for a VerifiableCredential. */
export type CredentialId = string & { readonly __brand: "CredentialId" };
export function newCredentialId(): CredentialId {
  return `urn:veritas:vc:${newId("vc")}` as CredentialId;
}

/** Credential status entry (Status List 2021 compatible). */
export interface CredentialStatus {
  readonly id: string;
  readonly type: string;
  readonly statusListIndex: string;
  readonly statusListCredential: string;
}

/** Credential schema reference. */
export interface CredentialSchemaRef {
  readonly id: string;
  readonly type: string;
}

/** Evidence entry inside a credential. */
export interface CredentialEvidence {
  readonly id?: string;
  readonly type: readonly string[];
  readonly [key: string]: unknown;
}

/** Core VC subject — must have an id in our model. */
export interface CredentialSubject {
  readonly id: Did;
  readonly [key: string]: unknown;
}

/** A signed proof block attached to the credential. */
export interface CredentialProof {
  readonly type: string;
  readonly created: IsoTimestamp;
  readonly verificationMethod: string;
  readonly proofPurpose: string;
  readonly jws?: string;
  readonly proofValue?: string;
  readonly [key: string]: unknown;
}

/** Immutable W3C Verifiable Credential structure. */
export interface VerifiableCredential {
  readonly "@context": readonly string[];
  readonly id: CredentialId;
  readonly type: readonly string[];
  readonly issuer: Did | { readonly id: Did; readonly [key: string]: unknown };
  readonly issuanceDate: IsoTimestamp;
  readonly expirationDate?: IsoTimestamp;
  readonly credentialSubject: CredentialSubject | readonly CredentialSubject[];
  readonly credentialStatus?: CredentialStatus;
  readonly credentialSchema?: CredentialSchemaRef | readonly CredentialSchemaRef[];
  readonly evidence?: readonly CredentialEvidence[];
  readonly contentHash?: ContentHash;
  readonly proof?: CredentialProof;
}

/** Zod schema for partial VC validation (structural check). */
export const verifiableCredentialSchema = z.object({
  "@context": z.array(z.string()).min(1),
  id: z.string(),
  type: z.array(z.string()).min(1),
  issuer: z.union([z.string(), z.object({ id: z.string() }).passthrough()]),
  issuanceDate: isoTimestampSchema,
  expirationDate: isoTimestampSchema.optional(),
  credentialSubject: z.union([
    z.object({ id: z.string() }).passthrough(),
    z.array(z.object({ id: z.string() }).passthrough()),
  ]),
  credentialStatus: z
    .object({
      id: z.string(),
      type: z.string(),
      statusListIndex: z.string(),
      statusListCredential: z.string(),
    })
    .optional(),
  contentHash: contentHashSchema.optional(),
  proof: z.record(z.unknown()).optional(),
});

/** Build options for creating an unsigned credential. */
export interface BuildCredentialOptions {
  readonly id?: CredentialId;
  readonly additionalTypes?: readonly string[];
  readonly additionalContexts?: readonly string[];
  readonly issuer: Did | { readonly id: Did; readonly [key: string]: unknown };
  readonly issuanceDate: IsoTimestamp;
  readonly expirationDate?: IsoTimestamp;
  readonly credentialSubject: CredentialSubject | readonly CredentialSubject[];
  readonly credentialStatus?: CredentialStatus;
  readonly credentialSchema?: CredentialSchemaRef | readonly CredentialSchemaRef[];
  readonly evidence?: readonly CredentialEvidence[];
  readonly contentHash?: ContentHash;
}

/** Construct an unsigned VerifiableCredential (no proof). */
export function buildCredential(opts: BuildCredentialOptions): VerifiableCredential {
  const contexts: string[] = [VC_CONTEXT_V1, VERITAS_VC_CONTEXT, ...(opts.additionalContexts ?? [])];
  const types: string[] = [VC_TYPE, ...(opts.additionalTypes ?? [])];

  return Object.freeze({
    "@context": Object.freeze(contexts),
    id: opts.id ?? newCredentialId(),
    type: Object.freeze(types),
    issuer: opts.issuer,
    issuanceDate: opts.issuanceDate,
    ...(opts.expirationDate !== undefined && { expirationDate: opts.expirationDate }),
    credentialSubject: opts.credentialSubject,
    ...(opts.credentialStatus !== undefined && { credentialStatus: opts.credentialStatus }),
    ...(opts.credentialSchema !== undefined && { credentialSchema: opts.credentialSchema }),
    ...(opts.evidence !== undefined && { evidence: Object.freeze([...opts.evidence]) }),
    ...(opts.contentHash !== undefined && { contentHash: opts.contentHash }),
  });
}

/** Attach a proof to an existing credential, returning a new immutable credential. */
export function attachProof(
  credential: VerifiableCredential,
  proof: CredentialProof,
): VerifiableCredential {
  return Object.freeze({ ...credential, proof: Object.freeze(proof) });
}

/** Extract the issuer DID from a credential. */
export function issuerDid(credential: VerifiableCredential): Did {
  if (typeof credential.issuer === "string") {
    return credential.issuer as Did;
  }
  return credential.issuer.id;
}

/** Return true if the credential has an expiration date in the past. */
export function isExpired(credential: VerifiableCredential, now: Date = new Date()): boolean {
  if (!credential.expirationDate) return false;
  return new Date(credential.expirationDate) < now;
}
