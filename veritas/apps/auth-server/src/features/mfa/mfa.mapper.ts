// Maps domain MFA entities to HTTP response payloads.

import type { MfaFactor, MfaChallenge, TotpEnrollResult, MfaEnrollmentStatus } from "@veritas/mfa";

export interface FactorResponse {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly verifiedAt: string | null;
}

export interface ChallengeResponse {
  readonly challengeId: string;
  readonly factorId: string;
  readonly factorKind: string;
  readonly expiresAt: string;
  readonly maxAttempts: number;
}

export interface EnrollTotpResponse {
  readonly factorId: string;
  readonly secret: string;
  readonly otpauthUri: string;
}

export interface VerifyOutcomeResponse {
  readonly challengeId: string;
  readonly status: string;
  readonly completedAt: string | null;
}

export function toFactorResponse(factor: MfaFactor): FactorResponse {
  return {
    id: factor.id,
    kind: factor.kind,
    label: factor.label,
    status: factor.status,
    createdAt: factor.createdAt,
    updatedAt: factor.updatedAt,
    verifiedAt: factor.verifiedAt,
  };
}

export function toChallengeResponse(challenge: MfaChallenge): ChallengeResponse {
  return {
    challengeId: challenge.id,
    factorId: challenge.factorId,
    factorKind: challenge.factorKind,
    expiresAt: challenge.expiresAt,
    maxAttempts: challenge.maxAttempts,
  };
}

export function toEnrollTotpResponse(result: TotpEnrollResult): EnrollTotpResponse {
  return {
    factorId: result.factorId,
    secret: result.secret,
    otpauthUri: result.otpauthUri,
  };
}

export function toVerifyOutcomeResponse(challenge: MfaChallenge): VerifyOutcomeResponse {
  return {
    challengeId: challenge.id,
    status: challenge.status,
    completedAt: challenge.completedAt,
  };
}

export function toEnrollmentStatusResponse(status: MfaEnrollmentStatus): MfaEnrollmentStatus {
  return { ...status };
}
