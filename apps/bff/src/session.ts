// BFF session management: read/write signed session cookies and expose the session principal.
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateToken, verifyToken } from "@veritas/auth";
import { type Result, ok, err } from "@veritas/core";

/** Cookie name used to persist the BFF session token. */
const SESSION_COOKIE = "vtok";

/** Default session TTL: 24 hours in seconds. */
const SESSION_TTL_SECONDS = 86_400;

export interface BffSession {
  readonly userId: string;
  readonly organizationId: string;
  readonly sessionId: string;
  readonly expiresAt: number;
}

/** Write a signed session cookie to the Hono response. */
export function writeSessionCookie(c: Context, session: BffSession, secret: string): void {
  const token = generateToken(secret, {
    userId: session.userId,
    organizationId: session.organizationId,
    sessionId: session.sessionId,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "Lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

/** Clear the session cookie from the Hono response. */
export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { httpOnly: true, path: "/" });
}

/** Read and verify the session cookie from the Hono context. */
export function readSession(c: Context, secret: string): Result<BffSession, string> {
  const raw = getCookie(c, SESSION_COOKIE);
  if (!raw || raw.length === 0) {
    return err("no session cookie");
  }
  const result = verifyToken({ secret, token: raw });
  if (!result.ok) {
    return err(result.error.message);
  }
  const claims = result.value;
  return ok({
    userId: claims.userId,
    organizationId: claims.organizationId,
    sessionId: claims.sessionId,
    expiresAt: claims.expiresAt,
  });
}
