// AES-256-GCM authenticated encryption and decryption helpers.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { EncryptionError, DecryptionError } from "./errors.js";

/** The AES-GCM IV length in bytes (96-bit nonce is NIST-recommended). */
const IV_LENGTH = 12;

/** The AES-GCM authentication tag length in bytes. */
const TAG_LENGTH = 16;

/**
 * The wire format for ciphertext: IV (12 bytes) | TAG (16 bytes) | ciphertext.
 * All three components are concatenated into a single Buffer.
 */
export interface EncryptedPayload {
  /** Concatenated buffer: IV + auth tag + ciphertext. */
  readonly data: Buffer;
}

/**
 * Encrypts `plaintext` with AES-256-GCM using the supplied 32-byte `key`.
 * Returns an {@link EncryptedPayload} on success.
 */
export function encrypt(
  plaintext: Buffer | Uint8Array | string,
  key: Buffer,
): Result<EncryptedPayload, EncryptionError> {
  if (key.length !== 32) {
    return err(new EncryptionError(`Key must be 32 bytes for AES-256-GCM, got ${key.length}`));
  }
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const input = typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : Buffer.from(plaintext);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Wire format: IV | TAG | CIPHERTEXT
    const data = Buffer.concat([iv, tag, encrypted]);
    return ok({ data });
  } catch (e) {
    return err(new EncryptionError("AES-256-GCM encryption failed", e));
  }
}

/**
 * Decrypts an {@link EncryptedPayload} produced by {@link encrypt}.
 * Returns the plaintext Buffer on success.
 */
export function decrypt(
  payload: EncryptedPayload,
  key: Buffer,
): Result<Buffer, DecryptionError> {
  if (key.length !== 32) {
    return err(new DecryptionError(`Key must be 32 bytes for AES-256-GCM, got ${key.length}`));
  }
  if (payload.data.length < IV_LENGTH + TAG_LENGTH) {
    return err(new DecryptionError("Ciphertext is too short to be a valid AES-256-GCM payload"));
  }
  try {
    const iv = payload.data.subarray(0, IV_LENGTH);
    const tag = payload.data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = payload.data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return ok(plaintext);
  } catch (e) {
    return err(new DecryptionError("AES-256-GCM decryption failed — invalid key or corrupted data", e));
  }
}

/**
 * Encrypts `plaintext` to a Base64-encoded string.
 * Convenience wrapper around {@link encrypt}.
 */
export function encryptToBase64(
  plaintext: Buffer | Uint8Array | string,
  key: Buffer,
): Result<string, EncryptionError> {
  const result = encrypt(plaintext, key);
  if (result.ok) return ok(result.value.data.toString("base64"));
  return result;
}

/**
 * Decrypts a Base64-encoded payload produced by {@link encryptToBase64}.
 * Returns the plaintext as a UTF-8 string on success.
 */
export function decryptFromBase64(
  base64: string,
  key: Buffer,
): Result<string, DecryptionError> {
  const data = Buffer.from(base64, "base64");
  const result = decrypt({ data }, key);
  if (result.ok) return ok(result.value.toString("utf8"));
  return result;
}
