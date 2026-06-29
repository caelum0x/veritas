// MFA-specific error classes extending AppError for structured error handling.

import { AppError, type AppErrorOptions, type ErrorCode } from "@veritas/core";

const MFA_ERROR_CODES = [
  "MFA_FACTOR_NOT_FOUND",
  "MFA_FACTOR_ALREADY_EXISTS",
  "MFA_FACTOR_DISABLED",
  "MFA_FACTOR_REVOKED",
  "MFA_CHALLENGE_NOT_FOUND",
  "MFA_CHALLENGE_EXPIRED",
  "MFA_CHALLENGE_EXHAUSTED",
  "MFA_CHALLENGE_ALREADY_COMPLETED",
  "MFA_INVALID_TOKEN",
  "MFA_INVALID_SECRET",
  "MFA_INVALID_RECOVERY_CODE",
  "MFA_ENROLLMENT_INCOMPLETE",
  "MFA_POLICY_NOT_SATISFIED",
  "MFA_WEBAUTHN_ERROR",
] as const;

export type MfaErrorCode = (typeof MFA_ERROR_CODES)[number];

export class MfaError extends AppError {
  constructor(
    code: MfaErrorCode,
    httpStatus: number,
    defaultMessage: string,
    options?: AppErrorOptions
  ) {
    super(code as unknown as ErrorCode, httpStatus, defaultMessage, options);
    this.name = "MfaError";
  }
}

export class MfaFactorNotFoundError extends MfaError {
  constructor(factorId: string) {
    super("MFA_FACTOR_NOT_FOUND", 404, `MFA factor not found: ${factorId}`);
    this.name = "MfaFactorNotFoundError";
  }
}

export class MfaFactorAlreadyExistsError extends MfaError {
  constructor(userId: string, kind: string) {
    super(
      "MFA_FACTOR_ALREADY_EXISTS",
      409,
      `MFA factor of kind '${kind}' already exists for user: ${userId}`
    );
    this.name = "MfaFactorAlreadyExistsError";
  }
}

export class MfaFactorDisabledError extends MfaError {
  constructor(factorId: string) {
    super("MFA_FACTOR_DISABLED", 403, `MFA factor is disabled: ${factorId}`);
    this.name = "MfaFactorDisabledError";
  }
}

export class MfaChallengeNotFoundError extends MfaError {
  constructor(challengeId: string) {
    super(
      "MFA_CHALLENGE_NOT_FOUND",
      404,
      `MFA challenge not found: ${challengeId}`
    );
    this.name = "MfaChallengeNotFoundError";
  }
}

export class MfaChallengeExpiredError extends MfaError {
  constructor(challengeId: string) {
    super(
      "MFA_CHALLENGE_EXPIRED",
      410,
      `MFA challenge has expired: ${challengeId}`
    );
    this.name = "MfaChallengeExpiredError";
  }
}

export class MfaChallengeExhaustedError extends MfaError {
  constructor(challengeId: string) {
    super(
      "MFA_CHALLENGE_EXHAUSTED",
      429,
      `MFA challenge max attempts exceeded: ${challengeId}`
    );
    this.name = "MfaChallengeExhaustedError";
  }
}

export class MfaInvalidTokenError extends MfaError {
  constructor() {
    super("MFA_INVALID_TOKEN", 401, "Invalid or expired MFA token");
    this.name = "MfaInvalidTokenError";
  }
}

export class MfaInvalidSecretError extends MfaError {
  constructor(reason?: string) {
    super(
      "MFA_INVALID_SECRET",
      400,
      reason ? `Invalid MFA secret: ${reason}` : "Invalid MFA secret"
    );
    this.name = "MfaInvalidSecretError";
  }
}

export class MfaInvalidRecoveryCodeError extends MfaError {
  constructor() {
    super(
      "MFA_INVALID_RECOVERY_CODE",
      401,
      "Invalid or already-used recovery code"
    );
    this.name = "MfaInvalidRecoveryCodeError";
  }
}

export class MfaEnrollmentIncompleteError extends MfaError {
  constructor(factorId: string) {
    super(
      "MFA_ENROLLMENT_INCOMPLETE",
      403,
      `MFA factor enrollment not yet verified: ${factorId}`
    );
    this.name = "MfaEnrollmentIncompleteError";
  }
}

export class MfaPolicyNotSatisfiedError extends MfaError {
  constructor(policyName: string) {
    super(
      "MFA_POLICY_NOT_SATISFIED",
      403,
      `MFA policy '${policyName}' requirements not satisfied`
    );
    this.name = "MfaPolicyNotSatisfiedError";
  }
}

export class MfaWebAuthnError extends MfaError {
  constructor(reason: string) {
    super("MFA_WEBAUTHN_ERROR", 400, `WebAuthn error: ${reason}`);
    this.name = "MfaWebAuthnError";
  }
}
