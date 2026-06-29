// Sign HTTP requests using HMAC-SHA256 over a canonical request string.
import { createHash } from "node:crypto";
import { hmacSign } from "@veritas/crypto";
import { buildCanonicalRequest, canonicalizeQuery } from "./canonical.js";
import { generateNonce } from "./nonce.js";
import { currentTimestampSeconds } from "./timestamp.js";
import { SIGNATURE_HEADER, serializeSignatureHeader } from "./header.js";
import type { SignatureHeaderFields, SignatureAlgorithm } from "./types.js";

/** SHA-256 hex digest of a string or buffer. */
function sha256Hex(data: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

const EMPTY_BODY_HASH = sha256Hex("");

export interface SignRequestInput {
  readonly method: string;
  /** Full URL or path+query string. */
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
}

export interface SignRequestOptions {
  readonly keyId: string;
  readonly secret: string;
  readonly algorithm?: SignatureAlgorithm;
  /** Override nonce (useful in tests). */
  readonly nonce?: string;
  /** Override current timestamp in seconds (useful in tests). */
  readonly nowSeconds?: number;
}

export interface SignedRequest {
  /** The original headers merged with the added signature header. */
  readonly headers: Readonly<Record<string, string>>;
  /** The value of the X-Veritas-Signature header. */
  readonly signatureHeader: string;
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
 * Compute and attach signature headers to an outgoing request.
 * Returns the merged headers including X-Veritas-Signature.
 */
export function signRequest(
  input: SignRequestInput,
  opts: SignRequestOptions
): SignedRequest {
  const algorithm: SignatureAlgorithm = opts.algorithm ?? "hmac-sha256";
  const nonce = opts.nonce ?? generateNonce();
  const timestamp = opts.nowSeconds ?? currentTimestampSeconds();
  const bodyHash = input.body != null ? sha256Hex(input.body) : EMPTY_BODY_HASH;

  const { path, query } = splitUrl(input.url);

  // Headers to include in the canonical request (app headers only, no sig header yet).
  const signingHeaders: Record<string, string> = { ...input.headers };

  const canonicalInput = {
    method: input.method,
    path,
    query,
    headers: signingHeaders,
    bodyHash,
  };

  const canonical = buildCanonicalRequest(canonicalInput);
  const stringToSign = `VERITAS-HMAC-SHA256\n${sha256Hex(canonical)}`;
  const signature = hmacSign(opts.secret, stringToSign);

  const signedHeaders = Object.keys(signingHeaders)
    .map((h) => h.toLowerCase())
    .sort();

  const fields: SignatureHeaderFields = {
    keyId: opts.keyId,
    algorithm,
    timestamp,
    nonce,
    signature,
    signedHeaders,
  };

  const signatureHeaderValue = serializeSignatureHeader(fields);

  return {
    headers: { ...input.headers, [SIGNATURE_HEADER]: signatureHeaderValue },
    signatureHeader: signatureHeaderValue,
  };
}
