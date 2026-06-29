// Domain errors for the secrets package.
import { AppError } from "@veritas/core";

export class SecretNotFoundError extends AppError {
  constructor(name: string, version?: string) {
    super(
      "NOT_FOUND",
      404,
      `Secret not found: ${name}${version ? `@${version}` : ""}`,
      { details: { name, version } }
    );
    this.name = "SecretNotFoundError";
  }
}

export class SecretAccessError extends AppError {
  constructor(name: string, reason?: string) {
    super(
      "FORBIDDEN",
      403,
      `Access denied to secret: ${name}${reason ? ` — ${reason}` : ""}`,
      { details: { name, reason } }
    );
    this.name = "SecretAccessError";
  }
}

export class SecretRotationError extends AppError {
  constructor(name: string, cause?: unknown) {
    super("INTERNAL", 500, `Rotation failed for secret: ${name}`, { cause, details: { name } });
    this.name = "SecretRotationError";
  }
}

export class SecretValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, message);
    this.name = "SecretValidationError";
  }
}

export class SecretVersionNotFoundError extends AppError {
  constructor(name: string, version: string | number) {
    super("NOT_FOUND", 404, `Secret version not found: ${name}@${version}`, { details: { name, version } });
    this.name = "SecretVersionNotFoundError";
  }
}

export class SecretBackendError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, message, { cause });
    this.name = "SecretBackendError";
  }
}

export class SecretResolutionError extends AppError {
  constructor(ref: string, cause?: unknown) {
    super("INTERNAL", 500, `Failed to resolve secret reference: ${ref}`, { cause, details: { ref } });
    this.name = "SecretResolutionError";
  }
}

export type SecretsError =
  | SecretNotFoundError
  | SecretAccessError
  | SecretRotationError
  | SecretValidationError
  | SecretVersionNotFoundError
  | SecretBackendError
  | SecretResolutionError;
