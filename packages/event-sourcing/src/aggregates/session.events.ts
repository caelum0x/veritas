// Domain events for the Session aggregate.
import type { IsoTimestamp } from "@veritas/core";
import type { Session } from "@veritas/contracts";

export const SESSION_CREATED = "session.created" as const;
export const SESSION_REFRESHED = "session.refreshed" as const;
export const SESSION_REVOKED = "session.revoked" as const;
export const SESSION_EXPIRED = "session.expired" as const;

export interface SessionCreatedPayload {
  readonly sessionId: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly token: string;
  readonly refreshToken: string | null;
  readonly expiresAt: IsoTimestamp;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: IsoTimestamp;
}

export interface SessionRefreshedPayload {
  readonly sessionId: string;
  readonly newToken: string;
  readonly newRefreshToken: string | null;
  readonly expiresAt: IsoTimestamp;
  readonly refreshedAt: IsoTimestamp;
}

export interface SessionRevokedPayload {
  readonly sessionId: string;
  readonly revokedAt: IsoTimestamp;
  readonly reason: string | null;
}

export interface SessionExpiredPayload {
  readonly sessionId: string;
  readonly expiredAt: IsoTimestamp;
}

export type SessionEventPayload =
  | SessionCreatedPayload
  | SessionRefreshedPayload
  | SessionRevokedPayload
  | SessionExpiredPayload;
