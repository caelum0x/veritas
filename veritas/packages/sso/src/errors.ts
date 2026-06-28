// SSO-specific error types extending AppError conventions.

import { AppError, type ErrorCode } from "@veritas/core";

/** Union type alias used by IdpProvider port methods. */
export type ProviderError =
  | SsoError
  | ProviderNotFoundError
  | InvalidStateError
  | AssertionValidationError
  | TokenExchangeError
  | AttributeMappingError
  | JitProvisioningError
  | CallbackError;

export class SsoError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, message, { cause });
  }
}

export class ProviderNotFoundError extends AppError {
  constructor(providerId: string) {
    super("NOT_FOUND" as ErrorCode, 404, `SSO provider not found: ${providerId}`);
  }
}

export class InvalidStateError extends AppError {
  constructor(detail?: string) {
    super("UNAUTHORIZED" as ErrorCode, 401, detail ?? "OAuth state parameter is invalid or expired");
  }
}

export class AssertionValidationError extends AppError {
  constructor(detail: string) {
    super("UNAUTHORIZED" as ErrorCode, 401, `Assertion validation failed: ${detail}`);
  }
}

export class TokenExchangeError extends AppError {
  constructor(detail: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 502, `Token exchange failed: ${detail}`, { cause });
  }
}

export class AttributeMappingError extends AppError {
  constructor(field: string) {
    super("VALIDATION" as ErrorCode, 422, `Required attribute missing: ${field}`);
  }
}

export class JitProvisioningError extends AppError {
  constructor(detail: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 500, `JIT provisioning failed: ${detail}`, { cause });
  }
}

export class CallbackError extends AppError {
  constructor(detail: string, cause?: unknown) {
    super("INTERNAL" as ErrorCode, 400, `SSO callback error: ${detail}`, { cause });
  }
}
