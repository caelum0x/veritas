// Key fingerprint derivation: SHA-256 digest of DER/raw key material, hex-encoded
import { createHash } from "node:crypto";
import { encode as b64encode } from "./base64url.js";

export type KeyFingerprint = string & { readonly __brand: "KeyFingerprint" };

/** Compute a SHA-256 fingerprint of raw key bytes, returned as lowercase hex. */
export function fingerprintHex(keyMaterial: Uint8Array): KeyFingerprint {
  const digest = createHash("sha256").update(keyMaterial).digest("hex");
  return digest as KeyFingerprint;
}

/** Compute a SHA-256 fingerprint of raw key bytes, returned as base64url. */
export function fingerprintBase64url(keyMaterial: Uint8Array): KeyFingerprint {
  const digest = createHash("sha256").update(keyMaterial).digest();
  return b64encode(new Uint8Array(digest)) as KeyFingerprint;
}

/**
 * Compute a colon-separated SHA-256 fingerprint (SSH-style).
 * e.g. "SHA256:ab:cd:ef:..."
 */
export function fingerprintColonHex(keyMaterial: Uint8Array): KeyFingerprint {
  const hex = fingerprintHex(keyMaterial);
  const pairs = (hex.match(/.{2}/g) ?? []).join(":");
  return `SHA256:${pairs}` as KeyFingerprint;
}

export function isKeyFingerprint(value: unknown): value is KeyFingerprint {
  return typeof value === "string" && /^[0-9a-f]{64}$|^SHA256:[0-9a-f:]+$|^[A-Za-z0-9_-]{43}$/.test(value);
}
