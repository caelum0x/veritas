// Field-level encryption: encrypt/decrypt named fields in arbitrary records.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { KmsProvider } from "./provider.js";
import type { KeyHierarchy } from "./key-hierarchy.js";
import type { EncryptedField, FieldDescriptor } from "./types.js";
import { envelopeEncrypt, envelopeDecrypt } from "./envelope.js";
import { FieldEncryptionError, EnvelopeDecryptionError } from "./errors.js";

/** Encrypt a single string field value, returning an EncryptedField wrapper. */
export async function encryptField(
  fieldName: string,
  value: string,
  hierarchy: KeyHierarchy,
  kms: KmsProvider,
): Promise<Result<EncryptedField<string>, FieldEncryptionError>> {
  const kekResult = hierarchy.getActiveKekId();
  if (!kekResult.ok) return err(new FieldEncryptionError(fieldName, kekResult.error));

  const plaintext = Buffer.from(value, "utf8");
  const envelopeResult = await envelopeEncrypt(plaintext, kekResult.value, kms);
  if (!envelopeResult.ok) return err(new FieldEncryptionError(fieldName, envelopeResult.error));

  const encryptedField: EncryptedField<string> = {
    fieldName,
    envelope: envelopeResult.value,
    valueType: "string",
  };
  return ok(encryptedField);
}

/** Decrypt a single EncryptedField, returning the original string value. */
export async function decryptField(
  field: EncryptedField<string>,
  kms: KmsProvider,
): Promise<Result<string, EnvelopeDecryptionError>> {
  const result = await envelopeDecrypt(field.envelope, kms);
  if (!result.ok) return result;
  return ok(result.value.toString("utf8"));
}

/** Encrypt a JSON-serializable value, returning an EncryptedField wrapper. */
export async function encryptJsonField<T>(
  fieldName: string,
  value: T,
  hierarchy: KeyHierarchy,
  kms: KmsProvider,
): Promise<Result<EncryptedField<T>, FieldEncryptionError>> {
  const kekResult = hierarchy.getActiveKekId();
  if (!kekResult.ok) return err(new FieldEncryptionError(fieldName, kekResult.error));

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const envelopeResult = await envelopeEncrypt(plaintext, kekResult.value, kms);
  if (!envelopeResult.ok) return err(new FieldEncryptionError(fieldName, envelopeResult.error));

  const encryptedField: EncryptedField<T> = {
    fieldName,
    envelope: envelopeResult.value,
    valueType: "json",
  };
  return ok(encryptedField);
}

/** Decrypt a JSON EncryptedField, returning the parsed value. */
export async function decryptJsonField<T>(
  field: EncryptedField<T>,
  kms: KmsProvider,
): Promise<Result<T, EnvelopeDecryptionError | FieldEncryptionError>> {
  const result = await envelopeDecrypt(field.envelope, kms);
  if (!result.ok) return result;
  try {
    const parsed = JSON.parse(result.value.toString("utf8")) as T;
    return ok(parsed);
  } catch (e) {
    return err(new FieldEncryptionError(field.fieldName, e));
  }
}

/** Encrypt all string fields listed in descriptors within a record, returning a new record. */
export async function encryptRecord<T extends Record<string, unknown>>(
  record: T,
  descriptors: readonly FieldDescriptor[],
  hierarchy: KeyHierarchy,
  kms: KmsProvider,
): Promise<Result<T, FieldEncryptionError>> {
  const mutable: Record<string, unknown> = { ...record };
  for (const desc of descriptors) {
    const value = mutable[desc.path];
    if (typeof value !== "string") continue;
    const result = await encryptField(desc.path, value, hierarchy, kms);
    if (!result.ok) return result;
    mutable[desc.path] = result.value;
  }
  return ok(mutable as T);
}

/** Decrypt all EncryptedField entries in a record, returning a plain record. */
export async function decryptRecord<T extends Record<string, unknown>>(
  record: T,
  kms: KmsProvider,
): Promise<Result<T, EnvelopeDecryptionError | FieldEncryptionError>> {
  const mutable: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(mutable)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "envelope" in value &&
      "fieldName" in value
    ) {
      const field = value as EncryptedField<string>;
      if (field.valueType === "json") {
        const result = await decryptJsonField(field, kms);
        if (!result.ok) return result;
        mutable[key] = result.value;
      } else {
        const result = await decryptField(field, kms);
        if (!result.ok) return result;
        mutable[key] = result.value;
      }
    }
  }
  return ok(mutable as T);
}
