// SHA-256 and SHA-512 hashing helpers using the Node.js crypto module.
import { createHash } from "node:crypto";

/** Returns the hex-encoded SHA-256 digest of the given input. */
export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Returns the raw Buffer SHA-256 digest of the given input. */
export function sha256Raw(input: string | Buffer | Uint8Array): Buffer {
  return createHash("sha256").update(input).digest();
}

/** Returns the hex-encoded SHA-512 digest of the given input. */
export function sha512Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha512").update(input).digest("hex");
}

/** Returns the raw Buffer SHA-512 digest of the given input. */
export function sha512Raw(input: string | Buffer | Uint8Array): Buffer {
  return createHash("sha512").update(input).digest();
}

/** Returns the hex-encoded SHA-256 digest of a JSON-serialisable value (canonical JSON). */
export function hashObject(value: unknown): string {
  const json = JSON.stringify(value, Object.keys(value as object).sort());
  return sha256Hex(json);
}
