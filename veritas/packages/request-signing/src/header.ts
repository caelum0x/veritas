// Parse and serialize the X-Veritas-Signature HTTP header.
import type { SignatureHeaderFields, SignatureAlgorithm } from "./types.js";
import { InvalidSignatureHeaderError } from "./errors.js";
import { isSupportedAlgorithm } from "./scheme.js";

export const SIGNATURE_HEADER = "x-veritas-signature";

/**
 * Serializes signature fields into the X-Veritas-Signature header value.
 * Format: keyId=<id>,algorithm=<alg>,timestamp=<ts>,nonce=<n>,headers=<h1;h2>,signature=<sig>
 */
export function serializeSignatureHeader(fields: SignatureHeaderFields): string {
  const headersStr = [...fields.signedHeaders].join(";");
  return [
    `keyId=${fields.keyId}`,
    `algorithm=${fields.algorithm}`,
    `timestamp=${fields.timestamp}`,
    `nonce=${fields.nonce}`,
    `headers=${headersStr}`,
    `signature=${fields.signature}`,
  ].join(",");
}

/**
 * Parses the X-Veritas-Signature header value into structured fields.
 * Throws InvalidSignatureHeaderError on malformed input.
 */
export function parseSignatureHeader(raw: string): SignatureHeaderFields {
  const parts = raw.split(",");
  const map = new Map<string, string>();

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) {
      throw new InvalidSignatureHeaderError(`malformed token: ${part}`);
    }
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    map.set(key, value);
  }

  const keyId = map.get("keyId");
  const algorithm = map.get("algorithm");
  const timestampStr = map.get("timestamp");
  const nonce = map.get("nonce");
  const headersStr = map.get("headers");
  const signature = map.get("signature");

  if (!keyId) throw new InvalidSignatureHeaderError("missing keyId");
  if (!algorithm) throw new InvalidSignatureHeaderError("missing algorithm");
  if (!timestampStr) throw new InvalidSignatureHeaderError("missing timestamp");
  if (!nonce) throw new InvalidSignatureHeaderError("missing nonce");
  if (!headersStr) throw new InvalidSignatureHeaderError("missing headers");
  if (!signature) throw new InvalidSignatureHeaderError("missing signature");

  if (!isSupportedAlgorithm(algorithm)) {
    throw new InvalidSignatureHeaderError(`unsupported algorithm: ${algorithm}`);
  }

  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) {
    throw new InvalidSignatureHeaderError(`invalid timestamp: ${timestampStr}`);
  }

  const signedHeaders = headersStr.split(";").filter((h) => h.length > 0);

  return {
    keyId,
    algorithm: algorithm as SignatureAlgorithm,
    timestamp,
    nonce,
    signature,
    signedHeaders,
  };
}
