// Core types for the request-signing module.
import { z } from "zod";

/** Supported signature algorithms. */
export type SignatureAlgorithm = "hmac-sha256" | "ed25519";

/** Parsed fields from the X-Signature header. */
export interface SignatureHeaderFields {
  readonly keyId: string;
  readonly algorithm: SignatureAlgorithm;
  readonly timestamp: number;
  readonly nonce: string;
  readonly signature: string;
  readonly signedHeaders: readonly string[];
}

/** A signing key entry held in the key store. */
export interface SigningKeyEntry {
  readonly keyId: string;
  readonly secret: string;
  readonly algorithm: SignatureAlgorithm;
  readonly createdAt: number;
  readonly expiresAt?: number;
}

/** Parameters required to sign an outgoing request. */
export interface SignRequestParams {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
  readonly keyId: string;
}

/** Parameters required to verify an incoming request signature. */
export interface VerifyRequestParams {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
}

/** Result of a successful signature verification. */
export interface VerificationResult {
  readonly keyId: string;
  readonly algorithm: SignatureAlgorithm;
  readonly timestamp: number;
}

/** Configuration options for the timestamp window check. */
export interface TimestampWindowOptions {
  /** Maximum allowed clock skew in milliseconds (default: 300_000 = 5 min). */
  readonly maxSkewMs?: number;
}

export const signatureAlgorithmSchema = z.enum(["hmac-sha256", "ed25519"]);
