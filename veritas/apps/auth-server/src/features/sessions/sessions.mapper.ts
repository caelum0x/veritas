// Maps session domain objects to HTTP response payloads.

import type { SessionTokenPayload } from "@veritas/auth";

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly revokedAt: string | null;
  readonly lastActiveAt: string | null;
}

export interface SessionTokenResponse {
  readonly token: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly expiresAt: number;
}

export interface VerifiedSessionResponse {
  readonly valid: boolean;
  readonly userId: string;
  readonly organizationId: string;
  readonly sessionId: string;
  readonly expiresAt: number;
}

export function toSessionResponse(session: SessionRecord): SessionRecord {
  return { ...session };
}

export function toSessionTokenResponse(token: string, payload: SessionTokenPayload): SessionTokenResponse {
  return {
    token,
    sessionId: payload.sessionId,
    userId: payload.userId,
    organizationId: payload.organizationId,
    expiresAt: payload.expiresAt,
  };
}

export function toVerifiedSessionResponse(payload: SessionTokenPayload): VerifiedSessionResponse {
  return {
    valid: true,
    userId: payload.userId,
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    expiresAt: payload.expiresAt,
  };
}
