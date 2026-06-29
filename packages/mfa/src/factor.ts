// MFA factor type definitions — discriminated union of all supported factor kinds.

import { z } from "zod";
import { type UserId } from "@veritas/core";

export const FactorKindSchema = z.enum(["totp", "hotp", "webauthn", "recovery"]);
export type FactorKind = z.infer<typeof FactorKindSchema>;

export const FactorStatusSchema = z.enum(["pending", "active", "disabled", "revoked"]);
export type FactorStatus = z.infer<typeof FactorStatusSchema>;

export const TotpFactorSchema = z.object({
  id: z.string(),
  kind: z.literal("totp"),
  userId: z.string(),
  label: z.string(),
  secret: z.string(), // base32-encoded
  algorithm: z.enum(["SHA1", "SHA256", "SHA512"]).default("SHA1"),
  digits: z.number().int().min(6).max(8).default(6),
  period: z.number().int().positive().default(30),
  status: FactorStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  verifiedAt: z.string().nullable(),
});
export type TotpFactor = z.infer<typeof TotpFactorSchema>;

export const HotpFactorSchema = z.object({
  id: z.string(),
  kind: z.literal("hotp"),
  userId: z.string(),
  label: z.string(),
  secret: z.string(),
  algorithm: z.enum(["SHA1", "SHA256", "SHA512"]).default("SHA1"),
  digits: z.number().int().min(6).max(8).default(6),
  counter: z.number().int().nonnegative().default(0),
  status: FactorStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  verifiedAt: z.string().nullable(),
});
export type HotpFactor = z.infer<typeof HotpFactorSchema>;

export const WebAuthnFactorSchema = z.object({
  id: z.string(),
  kind: z.literal("webauthn"),
  userId: z.string(),
  label: z.string(),
  credentialId: z.string(),
  publicKey: z.string(), // base64-encoded COSE key
  signCount: z.number().int().nonnegative(),
  aaguid: z.string(),
  transports: z.array(z.string()),
  status: FactorStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  verifiedAt: z.string().nullable(),
});
export type WebAuthnFactor = z.infer<typeof WebAuthnFactorSchema>;

export const RecoveryFactorSchema = z.object({
  id: z.string(),
  kind: z.literal("recovery"),
  userId: z.string(),
  label: z.string(),
  codeHashes: z.array(z.string()), // bcrypt hashes of recovery codes
  usedCount: z.number().int().nonnegative().default(0),
  totalCount: z.number().int().positive(),
  status: FactorStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  verifiedAt: z.string().nullable(),
});
export type RecoveryFactor = z.infer<typeof RecoveryFactorSchema>;

export const MfaFactorSchema = z.discriminatedUnion("kind", [
  TotpFactorSchema,
  HotpFactorSchema,
  WebAuthnFactorSchema,
  RecoveryFactorSchema,
]);
export type MfaFactor = z.infer<typeof MfaFactorSchema>;

export interface FactorRepository {
  findById(id: string): Promise<MfaFactor | null>;
  findByUserId(userId: UserId): Promise<MfaFactor[]>;
  findActiveByUserId(userId: UserId): Promise<MfaFactor[]>;
  create(factor: MfaFactor): Promise<MfaFactor>;
  update(factor: MfaFactor): Promise<MfaFactor>;
  delete(id: string): Promise<void>;
}
