// Error types specific to the request-signing module.
import { AppError } from "@veritas/core";

export class SignatureExpiredError extends AppError {
  constructor(message = "Request signature has expired") {
    super("UNAUTHORIZED", 401, message, {});
    this.name = "SignatureExpiredError";
  }
}

export class SignatureMismatchError extends AppError {
  constructor(message = "Request signature does not match") {
    super("UNAUTHORIZED", 401, message, {});
    this.name = "SignatureMismatchError";
  }
}

export class InvalidSignatureHeaderError extends AppError {
  constructor(detail: string) {
    super("UNAUTHORIZED", 401, `Invalid signature header: ${detail}`, {});
    this.name = "InvalidSignatureHeaderError";
  }
}

export class NoncReusedError extends AppError {
  constructor(nonce: string) {
    super("UNAUTHORIZED", 401, `Nonce already used: ${nonce}`, {});
    this.name = "NoncReusedError";
  }
}

export class UnknownKeyIdError extends AppError {
  constructor(keyId: string) {
    super("UNAUTHORIZED", 401, `Unknown signing key: ${keyId}`, {});
    this.name = "UnknownKeyIdError";
  }
}

export class UnsupportedSchemeError extends AppError {
  constructor(scheme: string) {
    super("UNAUTHORIZED", 401, `Unsupported signature scheme: ${scheme}`, {});
    this.name = "UnsupportedSchemeError";
  }
}
