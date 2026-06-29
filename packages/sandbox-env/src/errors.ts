// Sandbox-specific error types extending AppError
import { AppError, type AppErrorOptions } from "@veritas/core";

export class SandboxNotFoundError extends AppError {
  constructor(sandboxId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Sandbox not found: ${sandboxId}`, options);
    this.name = "SandboxNotFoundError";
  }
}

export class SandboxAlreadyExistsError extends AppError {
  constructor(name: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Sandbox already exists with name: ${name}`, options);
    this.name = "SandboxAlreadyExistsError";
  }
}

export class SandboxSuspendedError extends AppError {
  constructor(sandboxId: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Sandbox is suspended: ${sandboxId}`, options);
    this.name = "SandboxSuspendedError";
  }
}

export class SandboxTerminatedError extends AppError {
  constructor(sandboxId: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Sandbox has been terminated: ${sandboxId}`, options);
    this.name = "SandboxTerminatedError";
  }
}

export class SandboxQuotaExceededError extends AppError {
  constructor(sandboxId: string, resource: string, options?: AppErrorOptions) {
    super("RATE_LIMITED", 429, `Sandbox quota exceeded for ${resource}: ${sandboxId}`, options);
    this.name = "SandboxQuotaExceededError";
  }
}

export class SandboxCredentialNotFoundError extends AppError {
  constructor(credentialId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Sandbox credential not found: ${credentialId}`, options);
    this.name = "SandboxCredentialNotFoundError";
  }
}

export class SandboxCredentialRevokedError extends AppError {
  constructor(credentialId: string, options?: AppErrorOptions) {
    super("UNAUTHORIZED", 401, `Sandbox credential has been revoked: ${credentialId}`, options);
    this.name = "SandboxCredentialRevokedError";
  }
}

export class SandboxIsolationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Sandbox isolation violation: ${message}`, options);
    this.name = "SandboxIsolationError";
  }
}

export class SandboxRegistryError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Sandbox registry error: ${message}`, options);
    this.name = "SandboxRegistryError";
  }
}
