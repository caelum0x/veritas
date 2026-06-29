// KMS port — interface for key management operations (create, retrieve, rotate, delete).
import { Result } from "@veritas/core";
import type {
  SymmetricKey,
  AsymmetricKeyPair,
  SymmetricKeyId,
  AsymmetricKeyId,
  CreateSymmetricKeyOptions,
  CreateAsymmetricKeyOptions,
} from "./key.js";
import type {
  CryptoError,
  KeyNotFoundError,
  KeyRotationError,
  EncryptionError,
} from "./errors.js";

/** Union of errors that KMS operations can produce. */
export type KmsError = CryptoError | KeyNotFoundError | KeyRotationError | EncryptionError;

/** Port interface for a Key Management Service. */
export interface KmsPort {
  /** Create and store a new symmetric key. */
  createSymmetricKey(
    options?: CreateSymmetricKeyOptions,
  ): Promise<Result<SymmetricKey, KmsError>>;

  /** Retrieve a symmetric key by its id. */
  getSymmetricKey(
    id: SymmetricKeyId,
  ): Promise<Result<SymmetricKey, KmsError>>;

  /** Create and store a new asymmetric key pair. */
  createKeyPair(
    options?: CreateAsymmetricKeyOptions,
  ): Promise<Result<AsymmetricKeyPair, KmsError>>;

  /** Retrieve an asymmetric key pair by its id. */
  getKeyPair(
    id: AsymmetricKeyId,
  ): Promise<Result<AsymmetricKeyPair, KmsError>>;

  /** Rotate a symmetric key — generates a new version and retires the old one. */
  rotateSymmetricKey(
    id: SymmetricKeyId,
  ): Promise<Result<SymmetricKey, KmsError>>;

  /** Rotate an asymmetric key pair — generates a new version and retires the old one. */
  rotateKeyPair(
    id: AsymmetricKeyId,
  ): Promise<Result<AsymmetricKeyPair, KmsError>>;

  /** Delete a key by id (both symmetric and asymmetric). */
  deleteKey(
    id: SymmetricKeyId | AsymmetricKeyId,
  ): Promise<Result<void, KmsError>>;

  /** List all symmetric key ids. */
  listSymmetricKeys(): Promise<Result<readonly SymmetricKeyId[], KmsError>>;

  /** List all asymmetric key pair ids. */
  listKeyPairs(): Promise<Result<readonly AsymmetricKeyId[], KmsError>>;
}
