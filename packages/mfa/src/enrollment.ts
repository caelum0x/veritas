// MFA enrollment orchestration — initiate and confirm enrollment for TOTP, HOTP, WebAuthn, and recovery factors.
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  type Result,
  ok,
  err,
  type AppError,
  ValidationError,
  ConflictError,
  InternalError,
} from "@veritas/core";
import {
  type MfaFactor,
  type TotpFactor,
  type HotpFactor,
  type WebAuthnFactor,
  type RecoveryFactor,
  type FactorRepository,
} from "./factor.js";
import { base32Encode } from "./base32.js";
import { verifyTotp } from "./totp.js";
import { verifyHotp } from "./hotp.js";
import {
  generateRecoveryCodes,
  type RecoveryCode,
} from "./recovery-codes.js";
import {
  type WebAuthnPort,
  type WebAuthnRegistrationOptions,
  type WebAuthnCredential,
} from "./webauthn-port.js";

/** Generate a cryptographically random base32-encoded secret for TOTP/HOTP. */
function generateSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

function nowIso(): string {
  return new Date().toISOString();
}

function newFactorId(): string {
  return randomBytes(12).toString("hex");
}

// ---------------------------------------------------------------------------
// TOTP enrollment
// ---------------------------------------------------------------------------

export interface TotpEnrollmentInit {
  readonly userId: string;
  readonly label: string;
  readonly digits?: number;
  readonly period?: number;
}

export interface TotpEnrollmentPending {
  readonly factor: TotpFactor;
  /** Plaintext secret — show to the user as a QR code or manual entry. */
  readonly plaintextSecret: string;
}

/** Creates a pending TOTP factor. Call confirmTotpEnrollment after the user scans. */
export async function initiateTotpEnrollment(
  input: TotpEnrollmentInit,
  repo: FactorRepository
): Promise<Result<TotpEnrollmentPending, AppError>> {
  const existing = await repo.findActiveByUserId(input.userId as never);
  const hasTotp = existing.some((f) => f.kind === "totp");
  if (hasTotp) {
    return err(new ConflictError({ message: "User already has an active TOTP factor" }));
  }

  const secret = generateSecret();
  const now = nowIso();
  const factor: TotpFactor = {
    id: newFactorId(),
    kind: "totp",
    userId: input.userId,
    label: input.label,
    secret,
    algorithm: "SHA1",
    digits: input.digits ?? 6,
    period: input.period ?? 30,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
  };

  const saved = await repo.create(factor);
  return ok({ factor: saved as TotpFactor, plaintextSecret: secret });
}

export interface TotpEnrollmentConfirm {
  readonly factorId: string;
  readonly token: string;
}

/** Verifies the first TOTP token and activates the factor. */
export async function confirmTotpEnrollment(
  input: TotpEnrollmentConfirm,
  repo: FactorRepository
): Promise<Result<TotpFactor, AppError>> {
  const raw = await repo.findById(input.factorId);
  if (!raw || raw.kind !== "totp") {
    return err(new ValidationError({ message: "TOTP factor not found" }));
  }
  if (raw.status !== "pending") {
    return err(new ConflictError({ message: "Factor is not in pending state" }));
  }

  const result = verifyTotp(input.token, raw.secret, {
    digits: raw.digits,
    period: raw.period,
  });

  if (!result.valid) {
    return err(new ValidationError({ message: "Invalid TOTP token" }));
  }

  const now = nowIso();
  const activated: TotpFactor = {
    ...raw,
    status: "active",
    verifiedAt: now,
    updatedAt: now,
  };

  const saved = await repo.update(activated);
  return ok(saved as TotpFactor);
}

// ---------------------------------------------------------------------------
// HOTP enrollment
// ---------------------------------------------------------------------------

export interface HotpEnrollmentInit {
  readonly userId: string;
  readonly label: string;
  readonly digits?: number;
}

export interface HotpEnrollmentPending {
  readonly factor: HotpFactor;
  readonly plaintextSecret: string;
}

/** Creates a pending HOTP factor. */
export async function initiateHotpEnrollment(
  input: HotpEnrollmentInit,
  repo: FactorRepository
): Promise<Result<HotpEnrollmentPending, AppError>> {
  const secret = generateSecret();
  const now = nowIso();
  const factor: HotpFactor = {
    id: newFactorId(),
    kind: "hotp",
    userId: input.userId,
    label: input.label,
    secret,
    algorithm: "SHA1",
    digits: input.digits ?? 6,
    counter: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
  };

  const saved = await repo.create(factor);
  return ok({ factor: saved as HotpFactor, plaintextSecret: secret });
}

export interface HotpEnrollmentConfirm {
  readonly factorId: string;
  readonly token: string;
}

/** Verifies the first HOTP token, advances the counter, and activates the factor. */
export async function confirmHotpEnrollment(
  input: HotpEnrollmentConfirm,
  repo: FactorRepository
): Promise<Result<HotpFactor, AppError>> {
  const raw = await repo.findById(input.factorId);
  if (!raw || raw.kind !== "hotp") {
    return err(new ValidationError({ message: "HOTP factor not found" }));
  }
  if (raw.status !== "pending") {
    return err(new ConflictError({ message: "Factor is not in pending state" }));
  }

  const result = verifyHotp(input.token, raw.secret, raw.counter, {
    digits: raw.digits,
    window: 10,
  });

  if (!result.valid || result.counter === undefined) {
    return err(new ValidationError({ message: "Invalid HOTP token" }));
  }

  const now = nowIso();
  const activated: HotpFactor = {
    ...raw,
    counter: result.counter + 1,
    status: "active",
    verifiedAt: now,
    updatedAt: now,
  };

  const saved = await repo.update(activated);
  return ok(saved as HotpFactor);
}

// ---------------------------------------------------------------------------
// WebAuthn enrollment
// ---------------------------------------------------------------------------

export interface WebAuthnEnrollmentInit {
  readonly userId: string;
  readonly userName: string;
  readonly displayName: string;
  readonly label: string;
}

export interface WebAuthnEnrollmentPending {
  readonly factor: WebAuthnFactor;
  readonly registrationOptions: WebAuthnRegistrationOptions;
}

/** Initiates WebAuthn registration by generating challenge options. */
export async function initiateWebAuthnEnrollment(
  input: WebAuthnEnrollmentInit,
  repo: FactorRepository,
  webAuthn: WebAuthnPort
): Promise<Result<WebAuthnEnrollmentPending, AppError>> {
  const regOptions = await webAuthn.generateRegistrationOptions(
    input.userId,
    input.userName,
    input.displayName
  );

  const now = nowIso();
  // Placeholder factor until credential is confirmed
  const factor: WebAuthnFactor = {
    id: newFactorId(),
    kind: "webauthn",
    userId: input.userId,
    label: input.label,
    credentialId: "",
    publicKey: "",
    signCount: 0,
    aaguid: "",
    transports: [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
  };

  const saved = await repo.create(factor);
  return ok({ factor: saved as WebAuthnFactor, registrationOptions: regOptions });
}

export interface WebAuthnEnrollmentConfirm {
  readonly factorId: string;
  readonly attestationResponse: Record<string, unknown>;
}

/** Verifies the WebAuthn attestation and activates the credential. */
export async function confirmWebAuthnEnrollment(
  input: WebAuthnEnrollmentConfirm,
  repo: FactorRepository,
  webAuthn: WebAuthnPort,
  registrationOptions: WebAuthnRegistrationOptions
): Promise<Result<WebAuthnFactor, AppError>> {
  const raw = await repo.findById(input.factorId);
  if (!raw || raw.kind !== "webauthn") {
    return err(new ValidationError({ message: "WebAuthn factor not found" }));
  }
  if (raw.status !== "pending") {
    return err(new ConflictError({ message: "Factor is not in pending state" }));
  }

  let credential: WebAuthnCredential;
  try {
    credential = await webAuthn.verifyRegistration(
      registrationOptions,
      input.attestationResponse
    );
  } catch (e) {
    return err(new ValidationError({ message: "WebAuthn attestation verification failed" }));
  }

  const now = nowIso();
  const activated: WebAuthnFactor = {
    ...raw,
    credentialId: credential.credentialId,
    publicKey: credential.publicKey,
    signCount: credential.signCount,
    aaguid: credential.aaguid,
    transports: credential.transports,
    status: "active",
    verifiedAt: now,
    updatedAt: now,
  };

  const saved = await repo.update(activated);
  return ok(saved as WebAuthnFactor);
}

// ---------------------------------------------------------------------------
// Recovery code enrollment
// ---------------------------------------------------------------------------

export interface RecoveryEnrollmentInit {
  readonly userId: string;
  readonly label?: string;
  readonly codeCount?: number;
}

export interface RecoveryEnrollmentResult {
  readonly factor: RecoveryFactor;
  /** Plaintext codes — displayed once, never stored in plaintext. */
  readonly codes: RecoveryCode[];
}

/** Generates recovery codes and immediately activates the factor. */
export async function enrollRecoveryCodes(
  input: RecoveryEnrollmentInit,
  repo: FactorRepository
): Promise<Result<RecoveryEnrollmentResult, AppError>> {
  const existing = await repo.findActiveByUserId(input.userId as never);
  const hasRecovery = existing.some((f) => f.kind === "recovery");
  if (hasRecovery) {
    return err(new ConflictError({ message: "User already has active recovery codes" }));
  }

  const codes = generateRecoveryCodes(input.codeCount ?? 8);
  const now = nowIso();

  const factor: RecoveryFactor = {
    id: newFactorId(),
    kind: "recovery",
    userId: input.userId,
    label: input.label ?? "Recovery Codes",
    codeHashes: codes.map((c) => c.hash),
    usedCount: 0,
    totalCount: codes.length,
    status: "active",
    createdAt: now,
    updatedAt: now,
    verifiedAt: now,
  };

  const saved = await repo.create(factor);
  return ok({ factor: saved as RecoveryFactor, codes });
}
