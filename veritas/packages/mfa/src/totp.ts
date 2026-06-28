// TOTP (Time-based One-Time Password) generation and verification per RFC 6238.
import { timingSafeEqual } from "node:crypto";
import { generateHotp } from "./hotp.js";

/** Options for TOTP generation and verification. */
export interface TotpOptions {
  /** OTP length in digits (default: 6). */
  digits?: number;
  /** Time step in seconds (default: 30). */
  period?: number;
  /** Allowed drift windows on each side for verification (default: 1). */
  window?: number;
}

/** Returns the current TOTP counter (time step) for a given time. */
export function totpCounter(period: number, atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / period);
}

/** Generates a TOTP token for the given base32-encoded secret. */
export function generateTotp(
  secret: string,
  options: TotpOptions = {},
  atMs: number = Date.now()
): string {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const counter = totpCounter(period, atMs);
  return generateHotp(secret, counter, { digits });
}

/** Result of TOTP verification including the matched time step. */
export interface TotpVerifyResult {
  valid: boolean;
  delta?: number;
}

/**
 * Verifies a TOTP token, allowing ±window time steps to account for clock drift.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyTotp(
  token: string,
  secret: string,
  options: TotpOptions = {},
  atMs: number = Date.now()
): TotpVerifyResult {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const window = options.window ?? 1;
  const counter = totpCounter(period, atMs);
  const tokenBuf = Buffer.from(token.padStart(digits, "0"));

  for (let delta = -window; delta <= window; delta++) {
    const expected = Buffer.from(
      generateHotp(secret, counter + delta, { digits })
    );
    if (
      expected.length === tokenBuf.length &&
      timingSafeEqual(expected, tokenBuf)
    ) {
      return { valid: true, delta };
    }
  }

  return { valid: false };
}

/** Returns the number of seconds remaining in the current TOTP window. */
export function totpSecondsRemaining(
  period: number = 30,
  atMs: number = Date.now()
): number {
  return period - (Math.floor(atMs / 1000) % period);
}
