// Crypto-specific error types for @veritas/crypto
import { AppError } from "@veritas/core";

export class CryptoError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Crypto error", { message, cause });
    this.name = "CryptoError";
  }
}

export class SignatureVerificationError extends AppError {
  constructor(message = "Signature verification failed", cause?: unknown) {
    super("UNAUTHORIZED", 401, "Signature verification failed", { message, cause });
    this.name = "SignatureVerificationError";
  }
}

export class KeyNotFoundError extends AppError {
  constructor(keyId: string) {
    super("NOT_FOUND", 404, "Key not found", { message: `Key not found: ${keyId}` });
    this.name = "KeyNotFoundError";
  }
}

export class KeyRotationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Key rotation error", { message, cause });
    this.name = "KeyRotationError";
  }
}

export class EncryptionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Encryption error", { message, cause });
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Decryption error", { message, cause });
    this.name = "DecryptionError";
  }
}

export class InvalidJwtError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAUTHORIZED", 401, "Invalid JWT", { message, cause });
    this.name = "InvalidJwtError";
  }
}

export class JwtExpiredError extends AppError {
  constructor() {
    super("UNAUTHORIZED", 401, "JWT has expired", {});
    this.name = "JwtExpiredError";
  }
}
