// Custom error types for the verifiable-credentials module.
import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

export class CredentialError extends AppError {
  constructor(message: string, cause?: unknown) {
    const opts: AppErrorOptions = { message, cause };
    super("INTERNAL", 500, "Credential error", opts);
    this.name = "CredentialError";
  }
}

export class CredentialVerificationError extends AppError {
  constructor(message: string, cause?: unknown) {
    const opts: AppErrorOptions = { message, cause };
    super("VALIDATION", 422, "Credential verification failed", opts);
    this.name = "CredentialVerificationError";
  }
}

export class CredentialExpiredError extends AppError {
  constructor(message = "Verifiable credential has expired") {
    super("VALIDATION", 422, "Verifiable credential has expired", { message });
    this.name = "CredentialExpiredError";
  }
}

export class CredentialRevocationError extends AppError {
  constructor(message = "Verifiable credential has been revoked") {
    super("VALIDATION", 422, "Verifiable credential has been revoked", { message });
    this.name = "CredentialRevocationError";
  }
}

export class InvalidProofError extends AppError {
  constructor(message: string, cause?: unknown) {
    const opts: AppErrorOptions = { message, cause };
    super("VALIDATION", 422, "Invalid proof", opts);
    this.name = "InvalidProofError";
  }
}

export class UnsupportedCredentialTypeError extends AppError {
  constructor(type: string) {
    super("VALIDATION", 422, "Unsupported credential type", { message: `Unsupported credential type: ${type}` });
    this.name = "UnsupportedCredentialTypeError";
  }
}

export class InvalidCredentialSubjectError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, "Invalid credential subject", { message });
    this.name = "InvalidCredentialSubjectError";
  }
}
