// Opaque session token generation and verification backed by HMAC-SHA256.

import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { ok, err, type Result } from "@veritas/core";
import { AuthError, InvalidTokenError } from "./errors.js";

/** Byte length of the random token nonce. */
const TOKEN_NONCE_BYTES = 32;

/** Separator used between token parts. */
const SEP = ".";

/** Prefix that identifies Veritas session tokens. */
const TOKEN_PREFIX = "vtok";

/** Default token TTL: 24 hours in seconds. */
export const DEFAULT_TOKEN_TTL_SECONDS = 86_400;

export interface SessionTokenPayload {
  readonly userId: string;
  readonly organizationId: string;
  readonly sessionId: string;
  /** Unix timestamp (seconds) when the token expires. */
  readonly expiresAt: number;
}

/** Encode a payload into a URL-safe base64 string. */
function encodePayload(payload: SessionTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Decode a base64url payload string, returning undefined on failure. */
function decodePayload(encoded: string): SessionTokenPayload | undefined {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as SessionTokenPayload;
  } catch {
    return undefined;
  }
}

/** Compute HMAC-SHA256 over `<prefix>.<nonce>.<encodedPayload>` using the secret. */
function computeMac(secret: string, parts: string): string {
  return createHmac("sha256", secret).update(parts, "utf8").digest("base64url");
}

/**
 * Generate a new opaque session token.
 * Format: `vtok.<nonce_hex>.<base64url_payload>.<hmac_base64url>`
 */
export function generateToken(
  secret: string,
  payload: SessionTokenPayload,
): string {
  const nonce = randomBytes(TOKEN_NONCE_BYTES).toString("hex");
  const encoded = encodePayload(payload);
  const unsigned = [TOKEN_PREFIX, nonce, encoded].join(SEP);
  const mac = computeMac(secret, unsigned);
  return [unsigned, mac].join(SEP);
}

/** Options for token verification. */
export interface VerifyTokenOptions {
  readonly secret: string;
  readonly token: string;
  /** Override clock for testing (milliseconds since epoch). */
  readonly nowMs?: number;
}

/** Verify a session token; returns the decoded payload or an error. */
export function verifyToken(
  opts: VerifyTokenOptions,
): Result<SessionTokenPayload, AuthError> {
  const { secret, token } = opts;
  const nowMs = opts.nowMs ?? Date.now();

  const parts = token.split(SEP);
  // Expect exactly 4 parts: prefix, nonce, payload, mac
  if (parts.length !== 4) {
    return err(new InvalidTokenError("Malformed token structure"));
  }

  const [prefix, nonce, encoded, mac] = parts as [string, string, string, string];

  if (prefix !== TOKEN_PREFIX) {
    return err(new InvalidTokenError("Unknown token prefix"));
  }

  if (!nonce || !encoded || !mac) {
    return err(new InvalidTokenError("Token parts are empty"));
  }

  // Verify HMAC
  const unsigned = [TOKEN_PREFIX, nonce, encoded].join(SEP);
  const expectedMac = computeMac(secret, unsigned);

  const expectedBuf = Buffer.from(expectedMac, "utf8");
  const actualBuf = Buffer.from(mac, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return err(new InvalidTokenError("Token signature invalid"));
  }

  const payload = decodePayload(encoded);
  if (payload == null) {
    return err(new InvalidTokenError("Token payload could not be decoded"));
  }

  if (nowMs >= payload.expiresAt * 1000) {
    return err(new InvalidTokenError("Token has expired"));
  }

  return ok(payload);
}

/** Build a SessionTokenPayload, defaulting expiresAt to now + ttl. */
export function buildTokenPayload(
  userId: string,
  organizationId: string,
  sessionId: string,
  ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS,
  nowMs: number = Date.now(),
): SessionTokenPayload {
  return {
    userId,
    organizationId,
    sessionId,
    expiresAt: Math.floor(nowMs / 1000) + ttlSeconds,
  };
}
