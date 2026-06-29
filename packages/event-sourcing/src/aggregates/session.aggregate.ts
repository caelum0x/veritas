// Session aggregate: manages authentication session lifecycle via event sourcing.
import { epochToIso, type IsoTimestamp } from "@veritas/core";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import {
  SESSION_CREATED,
  SESSION_EXPIRED,
  SESSION_REFRESHED,
  SESSION_REVOKED,
  type SessionCreatedPayload,
  type SessionExpiredPayload,
  type SessionRefreshedPayload,
  type SessionRevokedPayload,
} from "./session.events.js";

export type SessionStatus = "active" | "revoked" | "expired";

export interface SessionState {
  readonly sessionId: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly token: string;
  readonly refreshToken: string | null;
  readonly expiresAt: IsoTimestamp;
  readonly status: SessionStatus;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface CreateSessionParams {
  readonly sessionId: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly token: string;
  readonly refreshToken: string | null;
  readonly expiresAt: IsoTimestamp;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class SessionAggregate extends AggregateRoot {
  readonly aggregateType = "Session";

  private _state: SessionState | null = null;

  get id(): string {
    return this._state?.sessionId ?? "";
  }

  get state(): SessionState {
    if (!this._state) throw new Error("Session not initialized");
    return this._state;
  }

  get isActive(): boolean {
    return this._state?.status === "active";
  }

  static create(params: CreateSessionParams): SessionAggregate {
    const agg = new SessionAggregate();
    const now = epochToIso(Date.now());
    const payload: SessionCreatedPayload = {
      sessionId: params.sessionId,
      userId: params.userId,
      organizationId: params.organizationId,
      token: params.token,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: now,
    };
    agg.raise(SESSION_CREATED, payload);
    return agg;
  }

  refresh(newToken: string, newRefreshToken: string | null, expiresAt: IsoTimestamp): void {
    if (!this.isActive) throw new Error("Cannot refresh a non-active session");
    const payload: SessionRefreshedPayload = {
      sessionId: this.state.sessionId,
      newToken,
      newRefreshToken,
      expiresAt,
      refreshedAt: epochToIso(Date.now()),
    };
    this.raise(SESSION_REFRESHED, payload);
  }

  revoke(reason: string | null = null): void {
    if (!this.isActive) throw new Error("Session is not active");
    const payload: SessionRevokedPayload = {
      sessionId: this.state.sessionId,
      revokedAt: epochToIso(Date.now()),
      reason,
    };
    this.raise(SESSION_REVOKED, payload);
  }

  expire(): void {
    if (!this.isActive) throw new Error("Session is not active");
    const payload: SessionExpiredPayload = {
      sessionId: this.state.sessionId,
      expiredAt: epochToIso(Date.now()),
    };
    this.raise(SESSION_EXPIRED, payload);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case SESSION_CREATED: {
        const p = event.payload as SessionCreatedPayload;
        this._state = {
          sessionId: p.sessionId,
          userId: p.userId,
          organizationId: p.organizationId,
          token: p.token,
          refreshToken: p.refreshToken,
          expiresAt: p.expiresAt,
          status: "active",
          ipAddress: p.ipAddress,
          userAgent: p.userAgent,
          createdAt: p.createdAt,
          updatedAt: p.createdAt,
        };
        break;
      }
      case SESSION_REFRESHED: {
        if (!this._state) break;
        const p = event.payload as SessionRefreshedPayload;
        this._state = {
          ...this._state,
          token: p.newToken,
          refreshToken: p.newRefreshToken,
          expiresAt: p.expiresAt,
          updatedAt: p.refreshedAt,
        };
        break;
      }
      case SESSION_REVOKED: {
        if (!this._state) break;
        const p = event.payload as SessionRevokedPayload;
        this._state = { ...this._state, status: "revoked", updatedAt: p.revokedAt };
        break;
      }
      case SESSION_EXPIRED: {
        if (!this._state) break;
        const p = event.payload as SessionExpiredPayload;
        this._state = { ...this._state, status: "expired", updatedAt: p.expiredAt };
        break;
      }
    }
  }
}
