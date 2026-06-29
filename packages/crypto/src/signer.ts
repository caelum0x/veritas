// Signer interface and related types for pluggable signing backends.
import type { Result } from "@veritas/core";

/** Raw bytes representation accepted by sign/verify operations. */
export type Bytes = Buffer | Uint8Array;

/** A detached digital signature. */
export interface Signature {
  readonly algorithm: string;
  readonly keyId: string;
  readonly value: Buffer;
}

/**
 * Pluggable signing interface — implementations may use local key material,
 * KMS-backed keys, or HSMs.
 */
export interface Signer {
  /** Identifier of the key currently in use. */
  readonly keyId: string;

  /** Algorithm name (e.g. "Ed25519", "RS256"). */
  readonly algorithm: string;

  /**
   * Signs `message` and returns a {@link Signature} on success, or an
   * {@link AppError} on failure.
   */
  sign(message: Bytes): Promise<Result<Signature, Error>>;

  /**
   * Verifies `signature` against `message`.  Returns `true` inside the
   * {@link Result} when valid.
   */
  verify(message: Bytes, signature: Bytes): Promise<Result<boolean, Error>>;
}

/** Verifier-only subset of the {@link Signer} interface. */
export interface Verifier {
  readonly keyId: string;
  readonly algorithm: string;
  verify(message: Bytes, signature: Bytes): Promise<Result<boolean, Error>>;
}
