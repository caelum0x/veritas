// API access grants: scoped credentials issued to a partner for platform access.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

export type ApiAccessGrantId = Id<"pagrant">;

export function newApiAccessGrantId(): ApiAccessGrantId {
  return newId("pagrant");
}

export const ApiAccessScopeSchema = z.enum([
  "claims:read",
  "claims:write",
  "sources:read",
  "sources:write",
  "verifications:read",
  "verifications:write",
  "reports:read",
  "webhooks:manage",
  "analytics:read",
  "bulk:read",
  "bulk:write",
]);
export type ApiAccessScope = z.infer<typeof ApiAccessScopeSchema>;

export const ApiAccessGrantStatusSchema = z.enum(["active", "revoked", "expired"]);
export type ApiAccessGrantStatus = z.infer<typeof ApiAccessGrantStatusSchema>;

export const ApiAccessGrantSchema = z.object({
  id: z.string().startsWith("pagrant_"),
  partnerId: z.string().startsWith("partner_"),
  apiKeyId: z.string().min(1),
  scopes: z.array(ApiAccessScopeSchema).min(1),
  status: ApiAccessGrantStatusSchema,
  allowedIpRanges: z.array(z.string()).nullable(),
  revokedAt: z.string().datetime().nullable(),
  revokedReason: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ApiAccessGrant = z.infer<typeof ApiAccessGrantSchema>;

export const CreateApiAccessGrantSchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  apiKeyId: z.string().min(1),
  scopes: z.array(ApiAccessScopeSchema).min(1),
  allowedIpRanges: z.array(z.string()).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateApiAccessGrant = z.infer<typeof CreateApiAccessGrantSchema>;

export const RevokeApiAccessGrantSchema = z.object({
  revokedAt: z.string().datetime(),
  revokedReason: z.string().min(1),
});
export type RevokeApiAccessGrant = z.infer<typeof RevokeApiAccessGrantSchema>;

export function makeApiAccessGrant(
  input: CreateApiAccessGrant,
  now: string,
): ApiAccessGrant {
  return {
    id: newApiAccessGrantId() as string,
    partnerId: input.partnerId,
    apiKeyId: input.apiKeyId,
    scopes: input.scopes,
    status: "active",
    allowedIpRanges: input.allowedIpRanges ?? null,
    revokedAt: null,
    revokedReason: null,
    expiresAt: input.expiresAt ?? null,
    lastUsedAt: null,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function revokeApiAccessGrant(
  grant: ApiAccessGrant,
  input: RevokeApiAccessGrant,
  now: string,
): ApiAccessGrant {
  return {
    ...grant,
    status: "revoked",
    revokedAt: input.revokedAt,
    revokedReason: input.revokedReason,
    updatedAt: now,
  };
}

export function recordApiAccessGrantUsage(
  grant: ApiAccessGrant,
  usedAt: string,
): ApiAccessGrant {
  return { ...grant, lastUsedAt: usedAt };
}

export function isGrantValid(grant: ApiAccessGrant, now: string): boolean {
  if (grant.status !== "active") return false;
  if (grant.expiresAt !== null && grant.expiresAt <= now) return false;
  return true;
}

export function hasScope(grant: ApiAccessGrant, scope: ApiAccessScope): boolean {
  return grant.scopes.includes(scope);
}
