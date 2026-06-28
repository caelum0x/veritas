// Consent-specific error types extending AppError hierarchy.
import { AppError } from "@veritas/core";

export class ConsentNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Consent record not found: ${id}`);
  }
}

export class ConsentAlreadyWithdrawnError extends AppError {
  constructor(id: string) {
    super("CONFLICT", 409, `Consent already withdrawn: ${id}`);
  }
}

export class PurposeNotFoundError extends AppError {
  constructor(purposeId: string) {
    super("NOT_FOUND", 404, `Processing purpose not found: ${purposeId}`);
  }
}

export class PurposeAlreadyExistsError extends AppError {
  constructor(purposeId: string) {
    super("CONFLICT", 409, `Processing purpose already registered: ${purposeId}`);
  }
}

export class TermsVersionNotFoundError extends AppError {
  constructor(version: string) {
    super("NOT_FOUND", 404, `Terms version not found: ${version}`);
  }
}

export class ProofGenerationError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, `Consent proof generation failed: ${message}`);
  }
}

export class InvalidWithdrawalError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 400, `Invalid consent withdrawal: ${reason}`);
  }
}
