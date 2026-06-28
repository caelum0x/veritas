// HMAC-SHA256 sign and constant-time verify helpers.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Signs a message with HMAC-SHA256 and returns the hex digest. */
export function hmacSign(
  key: string | Buffer | Uint8Array,
  message: string | Buffer | Uint8Array
): string {
  return createHmac("sha256", key).update(message).digest("hex");
}

/** Returns the raw Buffer HMAC-SHA256 of a message. */
export function hmacRaw(
  key: string | Buffer | Uint8Array,
  message: string | Buffer | Uint8Array
): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

/**
 * Constant-time comparison of an expected HMAC-SHA256 hex digest against a
 * freshly computed one.  Returns true only when the signatures match.
 */
export function hmacVerify(
  key: string | Buffer | Uint8Array,
  message: string | Buffer | Uint8Array,
  signature: string
): boolean {
  const expected = Buffer.from(hmacSign(key, message), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
