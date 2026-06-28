// Cryptographically secure random bytes, tokens, and base-62 strings.
import { randomBytes } from "node:crypto";

const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Returns `byteLength` cryptographically random bytes as a Buffer. */
export function secureRandomBytes(byteLength: number): Buffer {
  if (byteLength <= 0) throw new RangeError("byteLength must be > 0");
  return randomBytes(byteLength);
}

/** Returns a hex-encoded random token of the given byte length (default 32). */
export function randomHex(byteLength = 32): string {
  return secureRandomBytes(byteLength).toString("hex");
}

/**
 * Returns a URL-safe base-62 random string of exactly `length` characters.
 * Uses rejection sampling to avoid modulo bias.
 */
export function randomBase62(length = 32): string {
  if (length <= 0) throw new RangeError("length must be > 0");

  const result: string[] = [];
  // Over-sample by 1.5× to absorb rejection-sampling waste.
  let buffer = randomBytes(Math.ceil(length * 1.5));
  let bufferOffset = 0;

  while (result.length < length) {
    if (bufferOffset >= buffer.length) {
      buffer = randomBytes(Math.ceil((length - result.length) * 1.5));
      bufferOffset = 0;
    }
    const byte = buffer[bufferOffset++];
    // Discard bytes >= 248 to prevent modulo bias (248 = floor(256/62)*62).
    if (byte !== undefined && byte < 248) {
      result.push(BASE62_CHARS[byte % 62] as string);
    }
  }

  return result.join("");
}

/** Returns a random integer in [min, max) using rejection sampling. */
export function randomInt(min: number, max: number): number {
  if (min >= max) throw new RangeError("min must be < max");
  const range = max - min;
  const limit = Math.floor(256 / range) * range;
  let byte: number;
  do {
    byte = randomBytes(1)[0] as number;
  } while (byte >= limit);
  return min + (byte % range);
}
