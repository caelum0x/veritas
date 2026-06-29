// Core types for envelope encryption, key hierarchy, and field-level encryption.
import { z } from "zod";

/** Unique identifier for a Key Encryption Key (KEK). */
export type KekId = string & { readonly __brand: "KekId" };
export const kekId = (s: string): KekId => s as KekId;

/** Unique identifier for a Data Encryption Key (DEK). */
export type DekId = string & { readonly __brand: "DekId" };
export const dekId = (s: string): DekId => s as DekId;

/** Zod schema for an encrypted envelope persisted alongside data. */
export const encryptedEnvelopeSchema = z.object({
  /** ID of the KEK that encrypted the DEK. */
  kekId: z.string(),
  /** Base64-encoded encrypted DEK (wrapped key). */
  encryptedDek: z.string(),
  /** Base64-encoded ciphertext of the actual plaintext data. */
  ciphertext: z.string(),
  /** Algorithm used. */
  algorithm: z.literal("aes-256-gcm"),
  /** Schema version for forward compatibility. */
  version: z.number().int().positive(),
});

export type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

/** An in-memory DEK with its raw bytes. */
export interface DataKey {
  readonly id: DekId;
  readonly keyMaterial: Buffer;
  readonly kekId: KekId;
  readonly createdAt: number;
}

/** A named field that should be encrypted at rest. */
export interface EncryptedField<T = string> {
  readonly fieldName: string;
  readonly envelope: EncryptedEnvelope;
  /** Optional hint for the value type (used for typed field decryption). */
  readonly valueType: "string" | "json";
  /** Original TypeScript value type (phantom). */
  readonly _phantom?: T;
}

/** Descriptor for a field that participates in field-level encryption. */
export interface FieldDescriptor {
  readonly path: string;
  readonly searchable: boolean;
}

/** Result of encrypting a record's sensitive fields. */
export type EncryptedRecord<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: T[K] extends string
    ? T[K] | EncryptedField<T[K]>
    : T[K];
};

/** Options for searchable (deterministic) encryption. */
export interface SearchableEncryptionOptions {
  /** Pepper/salt added to the plaintext before hashing for search tokens. */
  readonly pepper: string;
}

/** A search token produced by deterministic encryption for index lookup. */
export type SearchToken = string & { readonly __brand: "SearchToken" };
export const asSearchToken = (s: string): SearchToken => s as SearchToken;

/** Describes a rotation job: maps old KEK id to a new KEK id. */
export interface RotationPlan {
  readonly oldKekId: KekId;
  readonly newKekId: KekId;
  readonly initiatedAt: number;
}

/** Result of a completed key rotation for a single envelope. */
export interface RotationResult {
  readonly oldKekId: KekId;
  readonly newKekId: KekId;
  readonly rotatedAt: number;
  readonly newEnvelope: EncryptedEnvelope;
}
