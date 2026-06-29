// Signature scheme registry: maps algorithm identifiers to sign/verify implementations.
import { hmacSign, hmacVerify } from "@veritas/crypto";
import type { SignatureAlgorithm } from "./types.js";
import { UnsupportedSchemeError } from "./errors.js";

export interface SchemeImpl {
  sign(secret: string, message: string): string;
  verify(secret: string, message: string, signature: string): boolean;
}

const hmacScheme: SchemeImpl = {
  sign(secret, message) {
    return hmacSign(secret, message);
  },
  verify(secret, message, signature) {
    return hmacVerify(secret, message, signature);
  },
};

const schemeRegistry = new Map<SignatureAlgorithm, SchemeImpl>([
  ["hmac-sha256", hmacScheme],
]);

/** Returns the SchemeImpl for the given algorithm, or throws UnsupportedSchemeError. */
export function getScheme(algorithm: SignatureAlgorithm): SchemeImpl {
  const impl = schemeRegistry.get(algorithm);
  if (impl === undefined) {
    throw new UnsupportedSchemeError(algorithm);
  }
  return impl;
}

/** Returns true if the given string is a supported algorithm. */
export function isSupportedAlgorithm(value: string): value is SignatureAlgorithm {
  return schemeRegistry.has(value as SignatureAlgorithm);
}
