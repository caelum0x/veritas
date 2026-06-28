// Key material types for symmetric and asymmetric cryptographic operations.

/** Supported symmetric key algorithms. */
export type SymmetricAlgorithm = "aes-256-gcm";

/** Supported asymmetric key algorithms. */
export type AsymmetricAlgorithm = "ed25519";

/** Opaque branded string for symmetric key identifiers. */
export type SymmetricKeyId = string & { readonly __brand: "SymmetricKeyId" };

/** Cast a plain string to a SymmetricKeyId. */
export function symmetricKeyId(s: string): SymmetricKeyId {
  return s as SymmetricKeyId;
}

/** Opaque branded string for asymmetric key pair identifiers. */
export type AsymmetricKeyId = string & { readonly __brand: "AsymmetricKeyId" };

/** Cast a plain string to an AsymmetricKeyId. */
export function asymmetricKeyId(s: string): AsymmetricKeyId {
  return s as AsymmetricKeyId;
}

/** A symmetric key record managed by the KMS. */
export interface SymmetricKey {
  readonly id: SymmetricKeyId;
  readonly algorithm: SymmetricAlgorithm;
  readonly keyMaterial: Buffer;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly version: number;
}

/** A public/private asymmetric key pair managed by the KMS. */
export interface AsymmetricKeyPair {
  readonly id: AsymmetricKeyId;
  readonly algorithm: AsymmetricAlgorithm;
  readonly publicKey: Buffer;
  readonly privateKey: Buffer;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly version: number;
}

/** Union of all managed key types. */
export type ManagedKey = SymmetricKey | AsymmetricKeyPair;

/** Type guard: returns true if the key is a SymmetricKey. */
export function isSymmetricKey(key: ManagedKey): key is SymmetricKey {
  return "keyMaterial" in key;
}

/** Type guard: returns true if the key is an AsymmetricKeyPair. */
export function isAsymmetricKeyPair(key: ManagedKey): key is AsymmetricKeyPair {
  return "publicKey" in key && "privateKey" in key;
}

/** Options for creating a new symmetric key. */
export interface CreateSymmetricKeyOptions {
  readonly algorithm?: SymmetricAlgorithm;
  /** Time-to-live in milliseconds before the key expires. */
  readonly ttlMs?: number;
}

/** Options for creating a new asymmetric key pair. */
export interface CreateAsymmetricKeyOptions {
  readonly algorithm?: AsymmetricAlgorithm;
  /** Time-to-live in milliseconds before the key pair expires. */
  readonly ttlMs?: number;
}
