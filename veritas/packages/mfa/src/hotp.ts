// HOTP (HMAC-based One-Time Password) generation and verification per RFC 4226.
import { createHmac, timingSafeEqual } from "node:crypto";
import { base32Decode } from "./base32.js";

/** Options for HOTP generation. */
export interface HotpOptions {
  /** Number of digits in the OTP (default: 6). */
  digits?: number;
}

/** Generates an HOTP value for the given base32-encoded secret and counter. */
export function generateHotp(
  secret: string,
  counter: number,
  options: HotpOptions = {}
): string {
  const digits = options.digits ?? 6;
  const key = base32Decode(secret);

  // Pack counter as 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  counterBuf.writeUInt32BE(high, 0);
  counterBuf.writeUInt32BE(low, 4);

  const hmac = createHmac("sha1", key).update(counterBuf).digest();

  // Dynamic truncation
  const offset = (hmac[19] as number) & 0x0f;
  const code =
    (((hmac[offset] as number) & 0x7f) << 24) |
    (((hmac[offset + 1] as number) & 0xff) << 16) |
    (((hmac[offset + 2] as number) & 0xff) << 8) |
    ((hmac[offset + 3] as number) & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

/** Options for HOTP verification. */
export interface HotpVerifyOptions extends HotpOptions {
  /** Number of counter values to look ahead (default: 1). */
  window?: number;
}

/** Result of HOTP verification, including the matching counter value. */
export interface HotpVerifyResult {
  valid: boolean;
  counter?: number;
}

/**
 * Verifies an HOTP token against a counter, allowing a look-ahead window.
 * Returns the matching counter value on success so callers can advance state.
 */
export function verifyHotp(
  token: string,
  secret: string,
  counter: number,
  options: HotpVerifyOptions = {}
): HotpVerifyResult {
  const window = options.window ?? 1;
  const digits = options.digits ?? 6;
  const tokenBuf = Buffer.from(token.padStart(digits, "0"));

  for (let i = 0; i <= window; i++) {
    const expected = Buffer.from(
      generateHotp(secret, counter + i, { digits })
    );
    if (
      expected.length === tokenBuf.length &&
      timingSafeEqual(expected, tokenBuf)
    ) {
      return { valid: true, counter: counter + i };
    }
  }

  return { valid: false };
}
