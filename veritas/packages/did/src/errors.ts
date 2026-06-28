// DID-specific error types extending AppError for resolution and validation failures.
import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

/** Raised when a DID cannot be resolved by any registered method resolver. */
export class DidResolutionError extends AppError {
  readonly did: string;

  constructor(did: string, message?: string, options?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `Failed to resolve DID: ${did}`,
      { ...options, message: message ?? options?.message },
    );
    this.did = did;
  }
}

/** Raised when a DID string is syntactically or semantically invalid. */
export class DidValidationError extends AppError {
  readonly did: string;

  constructor(did: string, message?: string, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Invalid DID: ${did}`,
      { ...options, message: message ?? options?.message },
    );
    this.did = did;
  }
}

/** Raised when the DID method is not supported by any registered resolver. */
export class DidMethodNotSupportedError extends AppError {
  readonly method: string;

  constructor(method: string, options?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `DID method not supported: ${method}`,
      options,
    );
    this.method = method;
  }
}

/** Raised when a DID Document is malformed or missing required fields. */
export class DidDocumentError extends AppError {
  readonly did: string;

  constructor(did: string, message?: string, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Invalid DID Document for: ${did}`,
      { ...options, message: message ?? options?.message },
    );
    this.did = did;
  }
}

/** Raised when a verification method referenced by ID cannot be found. */
export class VerificationMethodNotFoundError extends AppError {
  readonly id: string;

  constructor(id: string, options?: AppErrorOptions) {
    super(
      "NOT_FOUND",
      404,
      `Verification method not found: ${id}`,
      options,
    );
    this.id = id;
  }
}
