// Maps @veritas/consent domain types to HTTP response shapes for consent endpoints.

import type { Consent } from "@veritas/consent";

export interface ConsentResponse {
  readonly id: string;
  readonly userId: string;
  readonly purposeId: string;
  readonly termsVersion: string;
  readonly status: string;
  readonly grantedAt?: string;
  readonly withdrawnAt?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConsentCheckResponse {
  readonly granted: boolean;
  readonly consentId?: string;
  readonly grantedAt?: string;
}

export function toConsentResponse(consent: Consent): ConsentResponse {
  return {
    id: consent.id,
    userId: consent.userId,
    purposeId: consent.purposeId,
    termsVersion: consent.termsVersion,
    status: consent.status,
    grantedAt: consent.grantedAt,
    withdrawnAt: consent.withdrawnAt,
    ipAddress: consent.ipAddress,
    userAgent: consent.userAgent,
    createdAt: consent.createdAt,
    updatedAt: consent.updatedAt,
  };
}

export function toConsentCheckResponse(consents: readonly Consent[]): ConsentCheckResponse {
  const active = consents.find((c) => c.status === "granted");
  return {
    granted: active !== undefined,
    consentId: active?.id,
    grantedAt: active?.grantedAt,
  };
}
