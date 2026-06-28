// Token service — wraps @veritas/auth token primitives with server config.

import { generateToken, verifyToken, type SessionTokenPayload, type VerifyTokenOptions } from "@veritas/auth";
import { ok, type Result } from "@veritas/core";
import type { AuthConfig } from "./config.js";
import type { AuthError } from "@veritas/auth";

export interface TokenService {
  /** Issue a signed session token; returns Ok(tokenString) on success. */
  issue(payload: Omit<SessionTokenPayload, "expiresAt">): Result<string, AuthError>;
  /** Verify and decode a session token. */
  verify(token: string, nowMs?: number): Result<SessionTokenPayload, AuthError>;
}

export function createTokenService(config: AuthConfig): TokenService {
  const { tokenSecret, tokenTtlSeconds } = config;

  return {
    issue(payload: Omit<SessionTokenPayload, "expiresAt">): Result<string, AuthError> {
      const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds;
      const token = generateToken(tokenSecret, { ...payload, expiresAt });
      return ok(token);
    },

    verify(token: string, nowMs?: number): Result<SessionTokenPayload, AuthError> {
      const opts: VerifyTokenOptions = { secret: tokenSecret, token, nowMs };
      return verifyToken(opts);
    },
  };
}
