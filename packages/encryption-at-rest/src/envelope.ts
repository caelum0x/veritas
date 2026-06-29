// Envelope encryption: wraps a DEK with a KEK and bundles ciphertext + wrapped key.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { KekId, EncryptedEnvelope } from "./types.js";
import type { KmsProvider } from "./provider.js";
import { generateDataKey, zeroize } from "./data-key.js";
import { cipherEncrypt, cipherDecrypt } from "./cipher.js";
import { EnvelopeDecryptionError, EncryptionAtRestError } from "./errors.js";

/** Encrypt plaintext bytes using envelope encryption under the given KEK. */
export async function envelopeEncrypt(
  plaintext: Buffer,
  kekId: KekId,
  kms: KmsProvider,
): Promise<Result<EncryptedEnvelope, EncryptionAtRestError>> {
  // 1. Generate a fresh DEK.
  const dekResult = generateDataKey(kekId);
  if (!dekResult.ok) return dekResult;
  const dek = dekResult.value;

  // 2. Encrypt the plaintext with the DEK.
  const encResult = cipherEncrypt(plaintext, dek.keyMaterial);
  if (!encResult.ok) {
    zeroize(dek.keyMaterial);
    return encResult;
  }

  // 3. Wrap the DEK with the KEK via KMS.
  const wrapResult = await kms.encryptDek(kekId, dek.keyMaterial);
  zeroize(dek.keyMaterial);
  if (!wrapResult.ok) {
    return err(new EncryptionAtRestError("Failed to wrap DEK with KEK", wrapResult.error));
  }

  const envelope: EncryptedEnvelope = {
    kekId,
    encryptedDek: wrapResult.value.toString("base64"),
    ciphertext: encResult.value.toString("base64"),
    algorithm: "aes-256-gcm",
    version: 1,
  };

  return ok(envelope);
}

/** Decrypt an envelope: unwrap the DEK via KMS, then decrypt the ciphertext. */
export async function envelopeDecrypt(
  envelope: EncryptedEnvelope,
  kms: KmsProvider,
): Promise<Result<Buffer, EnvelopeDecryptionError>> {
  // 1. Unwrap the DEK via KMS.
  const encryptedDek = Buffer.from(envelope.encryptedDek, "base64");
  const unwrapResult = await kms.decryptDek(envelope.kekId as KekId, encryptedDek);
  if (!unwrapResult.ok) {
    return err(new EnvelopeDecryptionError("Failed to unwrap DEK", unwrapResult.error));
  }

  const dekMaterial = unwrapResult.value;

  // 2. Decrypt the ciphertext with the unwrapped DEK.
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const decResult = cipherDecrypt(ciphertext, dekMaterial);
  zeroize(dekMaterial);

  if (!decResult.ok) {
    return err(new EnvelopeDecryptionError("Failed to decrypt ciphertext", decResult.error));
  }

  return ok(decResult.value);
}

/** Re-encrypt an envelope under a new KEK (used during key rotation). */
export async function envelopeReEncrypt(
  envelope: EncryptedEnvelope,
  newKekId: KekId,
  kms: KmsProvider,
): Promise<Result<EncryptedEnvelope, EncryptionAtRestError | EnvelopeDecryptionError>> {
  // Decrypt the plaintext first.
  const decResult = await envelopeDecrypt(envelope, kms);
  if (!decResult.ok) return decResult;

  // Re-encrypt under the new KEK.
  return envelopeEncrypt(decResult.value, newKekId, kms);
}
