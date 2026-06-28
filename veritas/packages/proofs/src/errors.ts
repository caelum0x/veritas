// Error types for the @veritas/proofs package.
import { AppError, type AppErrorOptions } from "@veritas/core";

/** Base class for all proof-related errors. */
export class ProofError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

/** Thrown when a proof cannot be verified. */
export class ProofVerificationError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 422, message, opts);
  }
}

/** Thrown when a proof encoding/decoding fails. */
export class ProofEncodingError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

/** Thrown when a proof transcript is invalid or tampered. */
export class TranscriptError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 422, message, opts);
  }
}

/** Thrown when proof inputs are structurally invalid. */
export class InvalidProofInputError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("VALIDATION", 400, message, opts);
  }
}
