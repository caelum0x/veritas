// Domain errors for the @veritas/attestation package

import { AppError, type AppErrorOptions } from "@veritas/core";

export class AttestationNotFoundError extends AppError {
  constructor(uid: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Attestation not found: ${uid}`, options);
    this.name = "AttestationNotFoundError";
  }
}

export class AttestationRevokedError extends AppError {
  constructor(uid: string, options: AppErrorOptions = {}) {
    super("CONFLICT", 409, `Attestation already revoked: ${uid}`, options);
    this.name = "AttestationRevokedError";
  }
}

export class SchemaNotFoundError extends AppError {
  constructor(uid: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Schema not found: ${uid}`, options);
    this.name = "SchemaNotFoundError";
  }
}

export class AttestationPublishError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("UNAVAILABLE", 503, `Failed to publish attestation: ${message}`, options);
    this.name = "AttestationPublishError";
  }
}

export class AnchorError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("UNAVAILABLE", 503, `Failed to anchor batch: ${message}`, options);
    this.name = "AnchorError";
  }
}

export class AttestationVerifyError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Attestation verification failed: ${message}`, options);
    this.name = "AttestationVerifyError";
  }
}

export class AttestationEncodeError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("INTERNAL", 500, `Failed to encode attestation data: ${message}`, options);
    this.name = "AttestationEncodeError";
  }
}

/** Union of all attestation-specific errors for exhaustive handling. */
export type AttestationError =
  | AttestationNotFoundError
  | AttestationRevokedError
  | SchemaNotFoundError
  | AttestationPublishError
  | AnchorError
  | AttestationVerifyError
  | AttestationEncodeError;

export function isAttestationError(err: unknown): err is AttestationError {
  return (
    err instanceof AttestationNotFoundError ||
    err instanceof AttestationRevokedError ||
    err instanceof SchemaNotFoundError ||
    err instanceof AttestationPublishError ||
    err instanceof AnchorError ||
    err instanceof AttestationVerifyError ||
    err instanceof AttestationEncodeError
  );
}
