// Verify HMAC-SHA256 request signatures on incoming HTTP requests.
import { createHash } from "node:crypto";
import { hmacVerify } from "@veritas/crypto";
import { buildCanonicalRequest } from "./canonical.js";
import { isTimestampValid } from "./timestamp.js";
import { SIGNATURE_HEADER, parseSignatureHeader } from "./header.js";
import { InMemoryNonceStore } from "./nonce.js";
import type { VerificationResult } from "./types.js";
import {
  SignatureMismatchError,
  SignatureExpiredError,
  NoncReusedError,
  InvalidSignatureHeaderError,
} from "./errors.js";
import type { KeyStore } from "./key-store.js";

/** SHA-256 hex digest of a string or buffer. */
function sha256Hex(data: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

const EMPTY_BODY_HASH = sha256Hex("");

export interface VerifyRequestInput {
  readonly method: string;
  /** Full URL or path+query string. */
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
}

export interface VerifierOptions {
  readonly keyStore: KeyStore;
  readonly nonceStore?: InMemoryNonceStore;
  /** Maximum allowed clock skew in ms (default 5 min). */
  readonly maxSkewMs?: number;
  /** Override current time in ms (useful in tests). */
  readonly nowMs?: number;
}

/** Parse path and query from a URL or path string. */
function splitUrl(url: string): { path: string; query: Record<string, string> } {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return { path: url, query: {} };
  const path = url.slice(0, qIdx);
  const queryStr = url.slice(qIdx + 1);
  const query: Record<string, string> = {};
  for (const pair of queryStr.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    query[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
  }
  return { path, query };
}

/**
 * Verify the HMAC-SHA256 signature on an incoming request.
 * Throws a typed error on any verification failure.
 */
export function verifyRequest(
  input: VerifyRequestInput,
  opts: VerifierOptions
): VerificationResult {
  // Find signature header (case-insensitive).
  const rawSigHeader = Object.entries(input.headers).find(
    ([k]) => k.toLowerCase() === SIGNATURE_HEADER
  )?.[1];

  if (rawSigHeader === undefined) {
    throw new InvalidSignatureHeaderError("missing X-Veritas-Signature header");
  }

  const fields = parseSignatureHeader(rawSigHeader);

  // Timestamp validation.
  const nowMs = opts.nowMs ?? Date.now();
  if (!isTimestampValid(fields.timestamp, opts.maxSkewMs, nowMs)) {
    throw new SignatureExpiredError();
  }

  // Nonce replay prevention.
  const nonceStore = opts.nonceStore ?? new InMemoryNonceStore();
  if (!nonceStore.consume(fields.nonce, nowMs)) {
    throw new NoncReusedError(fields.nonce);
  }

  // Resolve signing key.
  const keyEntry = opts.keyStore.getKey(fields.keyId);

  // Rebuild canonical request from only the signed headers.
  const signedHeaderNames = new Set(fields.signedHeaders.map((h) => h.toLowerCase()));
  const signingHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.headers)) {
    if (signedHeaderNames.has(k.toLowerCase())) {
      signingHeaders[k] = v;
    }
  }

  const { path, query } = splitUrl(input.url);
  const bodyHash = input.body != null ? sha256Hex(input.body) : EMPTY_BODY_HASH;

  const canonical = buildCanonicalRequest({
    method: input.method,
    path,
    query,
    headers: signingHeaders,
    bodyHash,
  });

  const stringToSign = `VERITAS-HMAC-SHA256\n${sha256Hex(canonical)}`;

  if (!hmacVerify(keyEntry.secret, stringToSign, fields.signature)) {
    throw new SignatureMismatchError();
  }

  return {
    keyId: fields.keyId,
    algorithm: fields.algorithm,
    timestamp: fields.timestamp,
  };
}
