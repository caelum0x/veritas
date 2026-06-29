// Shared metadata types, key types, and branded strings for the DID module.

/** Metadata returned alongside a DID resolution result. */
export interface ResolutionMetadata {
  readonly contentType?: string;
  readonly error?: string;
  readonly message?: string;
  readonly retrieved?: string;
}

/** Metadata about the DID Document itself (creation, update, deactivation). */
export interface DocumentMetadata {
  readonly created?: string;
  readonly updated?: string;
  readonly deactivated?: boolean;
  readonly versionId?: string;
  readonly nextVersionId?: string;
  readonly equivalentId?: readonly string[];
  readonly canonicalId?: string;
}

/** Public key JWK representation (minimal subset). */
export interface PublicKeyJwk {
  readonly kty: string;
  readonly crv?: string;
  readonly x?: string;
  readonly y?: string;
  readonly n?: string;
  readonly e?: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly [key: string]: unknown;
}

/** Multibase-encoded public key type. */
export type MultibaseKey = string & { readonly __brand: "MultibaseKey" };

/** Cast a string to MultibaseKey (no runtime validation). */
export function asMultibaseKey(s: string): MultibaseKey {
  return s as MultibaseKey;
}

/** Supported verification method key types used across DID methods. */
export const SUPPORTED_KEY_TYPES = [
  "JsonWebKey2020",
  "Ed25519VerificationKey2020",
  "EcdsaSecp256k1VerificationKey2019",
  "EcdsaSecp256k1RecoveryMethod2020",
  "X25519KeyAgreementKey2020",
  "Multikey",
] as const;

export type SupportedKeyType = (typeof SUPPORTED_KEY_TYPES)[number];

/** TTL in milliseconds for cached DID resolutions (5 minutes). */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum number of entries in the resolution cache. */
export const DEFAULT_CACHE_MAX_SIZE = 512;

// ResolutionOptions is defined in resolver.ts — imported from there to avoid ambiguous re-export.
