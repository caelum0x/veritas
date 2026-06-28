// JSON-LD context URLs and inline context documents for W3C Verifiable Credentials.

/** Standard W3C VC context URL (VC Data Model v1). */
export const VC_CONTEXT_V1 = "https://www.w3.org/2018/credentials/v1" as const;

/** W3C VC Data Model v2 context URL. */
export const VC_CONTEXT_V2 = "https://www.w3.org/ns/credentials/v2" as const;

/** W3C DID Core context URL. */
export const DID_CONTEXT_V1 = "https://www.w3.org/ns/did/v1" as const;

/** Status List 2021 context URL. */
export const STATUS_LIST_2021_CONTEXT = "https://w3id.org/vc/status-list/2021/v1" as const;

/** Veritas-specific VC extension context URL. */
export const VERITAS_VC_CONTEXT = "https://veritas.croo.network/contexts/vc/v1" as const;

/** Ed25519Signature2020 context URL. */
export const ED25519_2020_CONTEXT = "https://w3id.org/security/suites/ed25519-2020/v1" as const;

/** DataIntegrityProof context URL. */
export const DATA_INTEGRITY_CONTEXT = "https://w3id.org/security/data-integrity/v1" as const;

/** All context URLs used by this module. */
export type KnownContextUrl =
  | typeof VC_CONTEXT_V1
  | typeof VC_CONTEXT_V2
  | typeof DID_CONTEXT_V1
  | typeof STATUS_LIST_2021_CONTEXT
  | typeof VERITAS_VC_CONTEXT
  | typeof ED25519_2020_CONTEXT
  | typeof DATA_INTEGRITY_CONTEXT;

/** Base context array for all Veritas VCs (v1 data model). */
export const BASE_VC_CONTEXTS: readonly string[] = Object.freeze([VC_CONTEXT_V1]);

/** Extended context array including Veritas extensions. */
export const VERITAS_VC_CONTEXTS: readonly string[] = Object.freeze([VC_CONTEXT_V1, VERITAS_VC_CONTEXT]);

/** Context array for Status List 2021 credentials. */
export const STATUS_LIST_CONTEXTS: readonly string[] = Object.freeze([VC_CONTEXT_V1, STATUS_LIST_2021_CONTEXT]);

/** Context array for credentials using Ed25519Signature2020 proofs. */
export const ED25519_PROOF_CONTEXTS: readonly string[] = Object.freeze([VC_CONTEXT_V1, ED25519_2020_CONTEXT]);

/** Check whether a context array includes the required base VC context. */
export function hasBaseContext(contexts: readonly string[]): boolean {
  return contexts.includes(VC_CONTEXT_V1) || contexts.includes(VC_CONTEXT_V2);
}

/** Merge additional context URLs into an existing context array (deduped, immutable). */
export function mergeContexts(base: readonly string[], additional: readonly string[]): readonly string[] {
  const seen = new Set(base);
  const extras = additional.filter((c) => !seen.has(c));
  return Object.freeze([...base, ...extras]);
}

/** Inline JSON-LD context term definitions for the Veritas extension context. */
export const VERITAS_INLINE_CONTEXT: Record<string, unknown> = Object.freeze({
  "@context": {
    "@version": 1.1,
    veritas: "https://veritas.croo.network/vocab#",
    VerificationCredential: "veritas:VerificationCredential",
    ClaimCredential: "veritas:ClaimCredential",
    verdict: "veritas:verdict",
    confidence: { "@id": "veritas:confidence", "@type": "xsd:decimal" },
    claimText: "veritas:claimText",
    sourceUrls: { "@id": "veritas:sourceUrls", "@container": "@set" },
    reportId: "veritas:reportId",
    verificationId: "veritas:verificationId",
    xsd: "http://www.w3.org/2001/XMLSchema#",
  },
});
