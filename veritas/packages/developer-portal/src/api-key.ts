// Developer portal API key management — create, revoke, and validate keys per app
import { z } from "zod";
import { newId, type IsoTimestamp } from "@veritas/core";
import { nonEmptyString, metadataSchema, timestampsSchema } from "@veritas/contracts";
import { AppEnvironmentSchema } from "./app.js";

export const ApiKeyScopeSchema = z.enum([
  "claims:read",
  "claims:write",
  "verifications:read",
  "verifications:write",
  "sources:read",
  "sources:write",
  "reports:read",
  "webhooks:manage",
]);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;

export const ApiKeyStatusSchema = z.enum(["active", "revoked", "expired"]);
export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;

export const PortalApiKeySchema = z.object({
  id: z.string(),
  appId: z.string(),
  organizationId: z.string(),
  name: nonEmptyString,
  keyPrefix: z.string().length(8),
  keyHash: z.string(),
  environment: AppEnvironmentSchema,
  scopes: z.array(ApiKeyScopeSchema).min(1),
  status: ApiKeyStatusSchema,
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  metadata: metadataSchema,
  timestamps: timestampsSchema,
});

export type PortalApiKey = z.infer<typeof PortalApiKeySchema>;

export const PortalApiKeyWithSecretSchema = PortalApiKeySchema.extend({
  secret: z.string(),
});
export type PortalApiKeyWithSecret = z.infer<typeof PortalApiKeyWithSecretSchema>;

export const CreatePortalApiKeySchema = PortalApiKeySchema
  .omit({ id: true, keyPrefix: true, keyHash: true, status: true, lastUsedAt: true, timestamps: true })
  .extend({ metadata: metadataSchema.default({}) });
export type CreatePortalApiKey = z.infer<typeof CreatePortalApiKeySchema>;

function generateKeySecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "vk_";
  for (let i = 0; i < 48; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function simpleHash(value: string): string {
  // Deterministic pseudo-hash for demo (no crypto dep required)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0") + value.slice(-8);
}

export function createPortalApiKey(input: CreatePortalApiKey, now: IsoTimestamp): PortalApiKeyWithSecret {
  const secret = generateKeySecret();
  const keyPrefix = secret.slice(3, 11);
  const keyHash = simpleHash(secret);
  return {
    ...input,
    id: newId("apikey"),
    keyPrefix,
    keyHash,
    status: "active",
    timestamps: { createdAt: now, updatedAt: now },
    secret,
  };
}

export function revokeApiKey(key: PortalApiKey, now: IsoTimestamp): PortalApiKey {
  return { ...key, status: "revoked", timestamps: { ...key.timestamps, updatedAt: now } };
}

export function recordApiKeyUsage(key: PortalApiKey, now: IsoTimestamp): PortalApiKey {
  return { ...key, lastUsedAt: now };
}

export function isApiKeyActive(key: PortalApiKey, now: IsoTimestamp): boolean {
  if (key.status !== "active") return false;
  if (key.expiresAt && key.expiresAt < now) return false;
  return true;
}
