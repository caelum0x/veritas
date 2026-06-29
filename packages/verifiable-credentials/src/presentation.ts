// W3C Verifiable Presentation data model — envelope for one or more VCs.
import { z } from "zod";
import { newId, isoTimestampSchema } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";
import type { Did } from "@veritas/did";
import { VC_CONTEXT_V1, VERITAS_VC_CONTEXT } from "./credential.js";
import type { VerifiableCredential, CredentialProof } from "./credential.js";

/** Unique identifier brand for a Verifiable Presentation. */
export type PresentationId = string & { readonly __brand: "PresentationId" };
export function newPresentationId(): PresentationId {
  return `urn:veritas:vp:${newId("vp")}` as PresentationId;
}

/** Immutable W3C Verifiable Presentation. */
export interface VerifiablePresentation {
  readonly "@context": readonly string[];
  readonly id: PresentationId;
  readonly type: readonly string[];
  readonly holder?: Did;
  readonly verifiableCredential?: readonly VerifiableCredential[];
  readonly proof?: CredentialProof;
}

/** Zod schema for structural VP validation. */
export const verifiablePresentationSchema = z.object({
  "@context": z.array(z.string()).min(1),
  id: z.string(),
  type: z.array(z.string()).min(1),
  holder: z.string().optional(),
  verifiableCredential: z.array(z.record(z.unknown())).optional(),
  proof: z.record(z.unknown()).optional(),
});

/** Options for building a Verifiable Presentation. */
export interface BuildPresentationOptions {
  readonly id?: PresentationId;
  readonly holder?: Did;
  readonly credentials?: readonly VerifiableCredential[];
  readonly additionalContexts?: readonly string[];
  readonly additionalTypes?: readonly string[];
}

/** Construct an unsigned VerifiablePresentation. */
export function buildPresentation(opts: BuildPresentationOptions): VerifiablePresentation {
  const contexts: string[] = [VC_CONTEXT_V1, VERITAS_VC_CONTEXT, ...(opts.additionalContexts ?? [])];
  const types: string[] = ["VerifiablePresentation", ...(opts.additionalTypes ?? [])];

  return Object.freeze({
    "@context": Object.freeze(contexts),
    id: opts.id ?? newPresentationId(),
    type: Object.freeze(types),
    ...(opts.holder !== undefined && { holder: opts.holder }),
    ...(opts.credentials !== undefined && {
      verifiableCredential: Object.freeze([...opts.credentials]),
    }),
  });
}

/** Attach a proof to a VP, returning a new immutable VP. */
export function attachPresentationProof(
  vp: VerifiablePresentation,
  proof: CredentialProof,
): VerifiablePresentation {
  return Object.freeze({ ...vp, proof: Object.freeze(proof) });
}

/** Options for a VP challenge (prevents replay attacks). */
export interface PresentationChallenge {
  readonly challenge: string;
  readonly domain?: string;
  readonly expiresAt?: IsoTimestamp;
}

/** Zod schema for PresentationChallenge. */
export const presentationChallengeSchema = z.object({
  challenge: z.string().min(8),
  domain: z.string().optional(),
  expiresAt: isoTimestampSchema.optional(),
});

/** Return true if the challenge has expired. */
export function isChallengeExpired(
  ch: PresentationChallenge,
  now: Date = new Date(),
): boolean {
  if (!ch.expiresAt) return false;
  return new Date(ch.expiresAt) < now;
}
