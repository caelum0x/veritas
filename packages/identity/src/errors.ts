// Identity-specific error types extending AppError for the identity module.
import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

/** Raised when an identity cannot be found in the registry. */
export class IdentityNotFoundError extends AppError {
  constructor(id: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Identity not found: ${id}`, options);
  }
}

/** Raised when an identity already exists and a duplicate is rejected. */
export class IdentityConflictError extends AppError {
  constructor(id: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Identity already exists: ${id}`, options);
  }
}

/** Raised when a cryptographic proof-of-control verification fails. */
export class ProofVerificationError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Proof verification failed: ${reason}`, options);
  }
}

/** Raised when a challenge is expired or not found. */
export class ChallengeError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Challenge error: ${reason}`, options);
  }
}

/** Raised when a wallet-to-agent link is invalid or cannot be established. */
export class LinkingError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Linking error: ${reason}`, options);
  }
}

/** Raised when key rotation fails. */
export class KeyRotationError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Key rotation error: ${reason}`, options);
  }
}

/** Union of all identity errors. */
export type IdentityError =
  | IdentityNotFoundError
  | IdentityConflictError
  | ProofVerificationError
  | ChallengeError
  | LinkingError
  | KeyRotationError;
