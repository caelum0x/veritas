// @veritas/mfa public surface — re-exports all MFA module components.

// Base32 codec
export { base32Encode, base32Decode, isValidBase32 } from "./base32.js";

// HOTP
export type { HotpOptions, HotpVerifyOptions, HotpVerifyResult } from "./hotp.js";
export { generateHotp, verifyHotp } from "./hotp.js";

// TOTP
export type { TotpOptions, TotpVerifyResult } from "./totp.js";
export { generateTotp, verifyTotp, totpCounter, totpSecondsRemaining } from "./totp.js";

// OTP auth URI / QR provisioning
export { buildOtpAuthUri, parseOtpAuthUri, buildTotpUri, buildHotpUri } from "./qr.js";

// Factor types
export { FactorKindSchema, FactorStatusSchema, TotpFactorSchema, HotpFactorSchema, WebAuthnFactorSchema, RecoveryFactorSchema, MfaFactorSchema } from "./factor.js";
export type { FactorKind, FactorStatus, TotpFactor, HotpFactor, WebAuthnFactor, RecoveryFactor, MfaFactor, FactorRepository } from "./factor.js";

// Challenge lifecycle
export { ChallengeStatusSchema, MfaChallengeSchema, issueChallenge, isChallengeExpired, isChallengeExhausted, incrementAttempt, completeChallenge, failChallenge, expireChallenge } from "./challenge.js";
export type { ChallengeStatus, MfaChallenge, ChallengeRepository, IssueChallengeInput } from "./challenge.js";

// MFA policy
export { MfaRequirementSchema, MfaPolicySchema, DEFAULT_POLICY, STRICT_POLICY, isMfaRequired, isFactorAllowed, isWithinGracePeriod, isDeviceRememberValid } from "./policy.js";
export type { MfaRequirement, MfaPolicy, PolicyRepository } from "./policy.js";

// WebAuthn port
export { MockWebAuthnPort } from "./webauthn-port.js";
export type { WebAuthnPort, WebAuthnRegistrationOptions, WebAuthnCredential, WebAuthnAuthenticationOptions, WebAuthnAssertion, WebAuthnVerifyResult } from "./webauthn-port.js";

// Errors
export { MfaError, MfaFactorNotFoundError, MfaFactorAlreadyExistsError, MfaFactorDisabledError, MfaChallengeNotFoundError, MfaChallengeExpiredError, MfaChallengeExhaustedError, MfaInvalidTokenError, MfaInvalidSecretError, MfaInvalidRecoveryCodeError, MfaEnrollmentIncompleteError, MfaPolicyNotSatisfiedError, MfaWebAuthnError } from "./errors.js";
export type { MfaErrorCode } from "./errors.js";

// Shared types and DTOs
export { OtpAlgorithmSchema, OtpDigitsSchema, OtpAuthUriParamsSchema, TotpEnrollInputSchema, TotpEnrollResultSchema, VerifyOtpInputSchema, VerifyWebAuthnInputSchema, VerifyRecoveryCodeInputSchema, MfaVerifyOutcomeSchema, MfaEnrollmentStatusSchema } from "./types.js";
export type { OtpAlgorithm, OtpDigits, OtpAuthUriParams, TotpEnrollInput, TotpEnrollResult, VerifyOtpInput, VerifyWebAuthnInput, VerifyRecoveryCodeInput, MfaVerifyOutcome, MfaEnrollmentStatus } from "./types.js";
