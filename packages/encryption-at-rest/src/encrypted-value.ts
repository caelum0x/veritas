// Branded wrapper distinguishing encrypted columns from plaintext values in the type system.
import { z } from "zod";
import { encryptedEnvelopeSchema } from "./types.js";
import type { EncryptedEnvelope } from "./types.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { EncryptionAtRestError } from "./errors.js";

/** Branded opaque type: an encrypted value carrying its full envelope. */
export type EncryptedValue = {
  readonly __encryptedValue: true;
  readonly envelope: EncryptedEnvelope;
  /** ISO-8601 timestamp when the value was encrypted. */
  readonly encryptedAt: string;
};

/** Construct an EncryptedValue from an envelope. */
export function encryptedValue(envelope: EncryptedEnvelope, encryptedAt?: string): EncryptedValue {
  return {
    __encryptedValue: true,
    envelope,
    encryptedAt: encryptedAt ?? new Date().toISOString(),
  };
}

/** Type guard: returns true if value is an EncryptedValue. */
export function isEncryptedValue(value: unknown): value is EncryptedValue {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)["__encryptedValue"] === true &&
    "envelope" in value &&
    "encryptedAt" in value
  );
}

/** Zod schema for serialized EncryptedValue (used in persistence layers). */
export const encryptedValueSchema = z.object({
  __encryptedValue: z.literal(true),
  envelope: encryptedEnvelopeSchema,
  encryptedAt: z.string().datetime(),
});

/** Serialize an EncryptedValue to a plain JSON-safe object. */
export function serializeEncryptedValue(ev: EncryptedValue): z.infer<typeof encryptedValueSchema> {
  return { __encryptedValue: true, envelope: ev.envelope, encryptedAt: ev.encryptedAt };
}

/** Deserialize a plain object back to an EncryptedValue; returns a Result. */
export function deserializeEncryptedValue(raw: unknown): Result<EncryptedValue, EncryptionAtRestError> {
  const parsed = encryptedValueSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new EncryptionAtRestError("Invalid EncryptedValue shape", parsed.error));
  }
  return ok(parsed.data as EncryptedValue);
}

/** Extract the raw EncryptedEnvelope from an EncryptedValue. */
export function getEnvelope(ev: EncryptedValue): EncryptedEnvelope {
  return ev.envelope;
}
