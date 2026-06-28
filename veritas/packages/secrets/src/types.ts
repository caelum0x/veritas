// Shared types for the secrets package — used by all other modules.

import { z } from "zod";

export const SecretIdSchema = z.string().min(1);
export type SecretId = z.infer<typeof SecretIdSchema>;

export const SecretVersionSchema = z.number().int().positive();
export type SecretVersion = z.infer<typeof SecretVersionSchema>;

export const SecretValueSchema = z.string();
export type SecretValue = z.infer<typeof SecretValueSchema>;

export const SecretMetadataSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  tags: z.record(z.string()).optional(),
  description: z.string().optional(),
});
export type SecretMetadata = z.infer<typeof SecretMetadataSchema>;

export const SecretEntrySchema = z.object({
  id: SecretIdSchema,
  version: SecretVersionSchema,
  value: SecretValueSchema,
  metadata: SecretMetadataSchema,
});
export type SecretEntry = z.infer<typeof SecretEntrySchema>;

export const SecretRefSchema = z.object({
  secretId: SecretIdSchema,
  version: SecretVersionSchema.optional(),
});
export type SecretRef = z.infer<typeof SecretRefSchema>;

export const RotationPolicySchema = z.object({
  intervalDays: z.number().int().positive(),
  notifyBeforeDays: z.number().int().nonnegative().default(3),
  autoRotate: z.boolean().default(false),
});
export type RotationPolicy = z.infer<typeof RotationPolicySchema>;

export const AuditEventTypeSchema = z.enum([
  "read",
  "write",
  "delete",
  "rotate",
  "cache_hit",
  "cache_miss",
]);
export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

export const SecretAuditEntrySchema = z.object({
  id: z.string(),
  secretId: SecretIdSchema,
  eventType: AuditEventTypeSchema,
  actor: z.string(),
  timestamp: z.string().datetime(),
  version: SecretVersionSchema.optional(),
  success: z.boolean(),
  details: z.record(z.unknown()).optional(),
});
export type SecretAuditEntry = z.infer<typeof SecretAuditEntrySchema>;

export const CacheEntrySchema = z.object({
  entry: SecretEntrySchema,
  cachedAt: z.number(),
  ttlMs: z.number().int().positive(),
});
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

export const VaultConfigSchema = z.object({
  address: z.string().url(),
  token: z.string().min(1),
  mountPath: z.string().default("secret"),
  namespace: z.string().optional(),
});
export type VaultConfig = z.infer<typeof VaultConfigSchema>;

export const EnvAdapterConfigSchema = z.object({
  prefix: z.string().default(""),
  delimiter: z.string().default("_"),
});
export type EnvAdapterConfig = z.infer<typeof EnvAdapterConfigSchema>;
