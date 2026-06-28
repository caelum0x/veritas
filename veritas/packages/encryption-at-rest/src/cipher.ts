// AES-256-GCM cipher wrapper delegating to @veritas/crypto encrypt/decrypt.
import { encrypt, decrypt } from "@veritas/crypto";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { EncryptionAtRestError } from "./errors.js";

/** Encrypt plaintext bytes with a 32-byte AES-256-GCM key. Returns ciphertext bytes. */
export function cipherEncrypt(
  plaintext: Buffer,
  key: Buffer,
): Result<Buffer, EncryptionAtRestError> {
  const result = encrypt(plaintext, key);
  if (!result.ok) return err(new EncryptionAtRestError("AES-256-GCM encryption failed", result.error));
  return ok(result.value.data);
}

/** Decrypt ciphertext bytes with a 32-byte AES-256-GCM key. Returns plaintext bytes. */
export function cipherDecrypt(
  ciphertext: Buffer,
  key: Buffer,
): Result<Buffer, EncryptionAtRestError> {
  const result = decrypt({ data: ciphertext }, key);
  if (!result.ok) return err(new EncryptionAtRestError("AES-256-GCM decryption failed", result.error));
  return ok(result.value);
}

/** Encrypt a UTF-8 string and return a Base64-encoded ciphertext string. */
export function cipherEncryptString(
  plaintext: string,
  key: Buffer,
): Result<string, EncryptionAtRestError> {
  const result = cipherEncrypt(Buffer.from(plaintext, "utf8"), key);
  if (!result.ok) return result;
  return ok(result.value.toString("base64"));
}

/** Decrypt a Base64-encoded ciphertext string and return the UTF-8 plaintext. */
export function cipherDecryptString(
  base64Ciphertext: string,
  key: Buffer,
): Result<string, EncryptionAtRestError> {
  const ciphertext = Buffer.from(base64Ciphertext, "base64");
  const result = cipherDecrypt(ciphertext, key);
  if (!result.ok) return result;
  return ok(result.value.toString("utf8"));
}
