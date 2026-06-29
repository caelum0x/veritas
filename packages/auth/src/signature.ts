// HMAC request signing and verification for Veritas webhook and agent callbacks.

import { createHmac, timingSafeEqual } from "node:crypto";
import { ok, err, type Result } from "@veritas/core";
import { AuthError, InvalidSignatureError } from "./errors.js";

/** Maximum age of a signed request before it is rejected (5 minutes). */
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

/** Header names used for Veritas request signatures. */
export const SIGNATURE_HEADER = "x-veritas-signature";
export const TIMESTAMP_HEADER = "x-veritas-timestamp";
export const SIGNATURE_VERSION = "v1";

/**
 * Build the canonical signing payload:
 *   "<version>:<timestamp>:<method>:<url>:<body>"
 */
function buildSigningPayload(
  version: string,
  timestamp: string,
  method: string,
  url: string,
  body: string,
): string {
  return [version, timestamp, method.toUpperCase(), url, body].join(":");
}

/** Compute an HMAC-SHA256 signature for the given payload. */
function computeHmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Sign a request, returning the signature string (without the version prefix). */
export function signRequest(
  secret: string,
  method: string,
  url: string,
  body: string,
  timestamp: string,
): string {
  const payload = buildSigningPayload(SIGNATURE_VERSION, timestamp, method, url, body);
  const mac = computeHmac(secret, payload);
  return `${SIGNATURE_VERSION}=${mac}`;
}

/** Options for signature verification. */
export interface VerifySignatureOptions {
  readonly secret: string;
  readonly method: string;
  readonly url: string;
  readonly body: string;
  /** Value of the X-Veritas-Signature header. */
  readonly signatureHeader: string | undefined;
  /** Value of the X-Veritas-Timestamp header (Unix seconds as string). */
  readonly timestampHeader: string | undefined;
  /** Override clock for testing (milliseconds since epoch). */
  readonly nowMs?: number;
}

/** Verify an incoming request signature; returns ok(true) or err(SignatureError). */
export function verifyRequestSignature(
  opts: VerifySignatureOptions,
): Result<true, AuthError> {
  const { secret, method, url, body, signatureHeader, timestampHeader } = opts;

  if (timestampHeader == null || timestampHeader === "") {
    return err(new InvalidSignatureError("Missing timestamp header"));
  }

  const timestampSec = Number(timestampHeader);
  if (!Number.isFinite(timestampSec)) {
    return err(new InvalidSignatureError("Invalid timestamp header"));
  }

  const nowMs = opts.nowMs ?? Date.now();
  const skewMs = Math.abs(nowMs - timestampSec * 1000);
  if (skewMs > MAX_TIMESTAMP_SKEW_MS) {
    return err(new InvalidSignatureError("Request timestamp is too old or too far in the future"));
  }

  if (signatureHeader == null || signatureHeader === "") {
    return err(new InvalidSignatureError("Missing signature header"));
  }

  const expected = signRequest(secret, method, url, body, timestampHeader);

  // Constant-time comparison to prevent timing attacks.
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return err(new InvalidSignatureError("Signature mismatch"));
  }

  return ok(true);
}
