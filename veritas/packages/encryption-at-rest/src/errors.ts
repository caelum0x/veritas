// Encryption-at-rest specific error types extending AppError.
import { AppError } from "@veritas/core";

export class EncryptionAtRestError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Encryption-at-rest error", { message, cause });
    this.name = "EncryptionAtRestError";
  }
}

export class KeyHierarchyError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Key hierarchy error", { message, cause });
    this.name = "KeyHierarchyError";
  }
}

export class EnvelopeDecryptionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Envelope decryption error", { message, cause });
    this.name = "EnvelopeDecryptionError";
  }
}

export class FieldEncryptionError extends AppError {
  constructor(field: string, cause?: unknown) {
    super("INTERNAL", 500, "Field encryption error", { message: `Failed to encrypt field: ${field}`, cause });
    this.name = "FieldEncryptionError";
  }
}

export class KeyRotationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Key rotation error", { message, cause });
    this.name = "KeyRotationError";
  }
}

export class SearchableEncryptionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Searchable encryption error", { message, cause });
    this.name = "SearchableEncryptionError";
  }
}

export class KmsProviderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, "KMS provider error", { message, cause });
    this.name = "KmsProviderError";
  }
}
