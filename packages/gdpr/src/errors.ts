// GDPR-specific error types for data subject request processing.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class DsrNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `DSR not found: ${id}`, opts);
  }
}

export class DsrAlreadyCompletedError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `DSR already completed: ${id}`, opts);
  }
}

export class IdentityVerificationFailedError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Identity verification failed: ${reason}`, opts);
  }
}

export class ConsentNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Consent record not found: ${id}`, opts);
  }
}

export class LawfulBasisMissingError extends AppError {
  constructor(processingPurpose: string, opts?: AppErrorOptions) {
    super("VALIDATION", 422, `No lawful basis for processing: ${processingPurpose}`, opts);
  }
}

export class ErasureBlockedError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Erasure blocked: ${reason}`, opts);
  }
}

export class PortabilityExportError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Portability export failed: ${reason}`, opts);
  }
}

export class DsrWorkflowError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `DSR workflow error: ${reason}`, opts);
  }
}
