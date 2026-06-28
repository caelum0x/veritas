// Shared MFA value types, DTOs, and algorithm enums used across the module.

import { z } from "zod";

/** Supported HMAC algorithms for TOTP/HOTP. */
export const OtpAlgorithmSchema = z.enum(["SHA1", "SHA256", "SHA512"]);
export type OtpAlgorithm = z.infer<typeof OtpAlgorithmSchema>;

/** Supported OTP digit lengths. */
export const OtpDigitsSchema = z.union([z.literal(6), z.literal(7), z.literal(8)]);
export type OtpDigits = z.infer<typeof OtpDigitsSchema>;

/** Parsed otpauth URI parameters for provisioning QR codes. */
export const OtpAuthUriParamsSchema = z.object({
  type: z.enum(["totp", "hotp"]),
  label: z.string().min(1),
  secret: z.string().min(1),
  issuer: z.string().min(1),
  algorithm: OtpAlgorithmSchema.default("SHA1"),
  digits: OtpDigitsSchema.default(6),
  /** Period in seconds (TOTP only). */
  period: z.number().int().positive().default(30).optional(),
  /** Initial counter value (HOTP only). */
  counter: z.number().int().nonnegative().default(0).optional(),
});
export type OtpAuthUriParams = z.infer<typeof OtpAuthUriParamsSchema>;

/** Enrollment input for TOTP/HOTP factors. */
export const TotpEnrollInputSchema = z.object({
  userId: z.string().min(1),
  label: z.string().min(1),
  issuer: z.string().min(1),
  algorithm: OtpAlgorithmSchema.optional(),
  digits: OtpDigitsSchema.optional(),
  period: z.number().int().positive().optional(),
});
export type TotpEnrollInput = z.infer<typeof TotpEnrollInputSchema>;

/** Enrollment result returned to the client. */
export const TotpEnrollResultSchema = z.object({
  factorId: z.string(),
  secret: z.string(), // base32-encoded, shown once
  otpauthUri: z.string(),
});
export type TotpEnrollResult = z.infer<typeof TotpEnrollResultSchema>;

/** Input for verifying an OTP token against an active challenge. */
export const VerifyOtpInputSchema = z.object({
  challengeId: z.string().min(1),
  token: z.string().min(6).max(8),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpInputSchema>;

/** Input for verifying a WebAuthn assertion. */
export const VerifyWebAuthnInputSchema = z.object({
  challengeId: z.string().min(1),
  credentialId: z.string().min(1),
  authenticatorData: z.string().min(1),
  signature: z.string().min(1),
  clientDataJSON: z.string().min(1),
  userHandle: z.string().optional(),
});
export type VerifyWebAuthnInput = z.infer<typeof VerifyWebAuthnInputSchema>;

/** Input for verifying a recovery code. */
export const VerifyRecoveryCodeInputSchema = z.object({
  userId: z.string().min(1),
  code: z.string().min(1),
});
export type VerifyRecoveryCodeInput = z.infer<typeof VerifyRecoveryCodeInputSchema>;

/** Outcome of any MFA verification attempt. */
export const MfaVerifyOutcomeSchema = z.object({
  success: z.boolean(),
  factorId: z.string(),
  factorKind: z.enum(["totp", "hotp", "webauthn", "recovery"]),
  verifiedAt: z.string(),
});
export type MfaVerifyOutcome = z.infer<typeof MfaVerifyOutcomeSchema>;

/** Enrollment status summary for a user. */
export const MfaEnrollmentStatusSchema = z.object({
  userId: z.string(),
  hasActiveFactors: z.boolean(),
  activeFactorCount: z.number().int().nonnegative(),
  factorKinds: z.array(z.enum(["totp", "hotp", "webauthn", "recovery"])),
  policyRequirement: z.enum(["none", "optional", "required", "enforced"]),
  policyName: z.string(),
});
export type MfaEnrollmentStatus = z.infer<typeof MfaEnrollmentStatusSchema>;
