// Core types for sandbox environment management
import { z } from "zod";

export const SandboxStatusSchema = z.enum(["pending", "active", "suspended", "terminated"]);
export type SandboxStatus = z.infer<typeof SandboxStatusSchema>;

export const SandboxTierSchema = z.enum(["trial", "developer", "partner", "enterprise"]);
export type SandboxTier = z.infer<typeof SandboxTierSchema>;

export const SandboxCredentialKindSchema = z.enum(["api_key", "jwt_secret", "webhook_secret", "oauth_client"]);
export type SandboxCredentialKind = z.infer<typeof SandboxCredentialKindSchema>;

export const SandboxQuotaSchema = z.object({
  maxRequestsPerMinute: z.number().int().positive(),
  maxRequestsPerDay: z.number().int().positive(),
  maxConcurrentRequests: z.number().int().positive(),
  maxStorageMb: z.number().positive(),
  maxWebhooks: z.number().int().nonnegative(),
});
export type SandboxQuota = z.infer<typeof SandboxQuotaSchema>;

export const SandboxCredentialSchema = z.object({
  id: z.string(),
  sandboxId: z.string(),
  kind: SandboxCredentialKindSchema,
  key: z.string(),
  secret: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().optional(),
});
export type SandboxCredential = z.infer<typeof SandboxCredentialSchema>;

export const SandboxSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1).max(128),
  tier: SandboxTierSchema,
  status: SandboxStatusSchema,
  quota: SandboxQuotaSchema,
  isolationToken: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  suspendedAt: z.string().datetime().optional(),
  terminatedAt: z.string().datetime().optional(),
});
export type Sandbox = z.infer<typeof SandboxSchema>;

export const CreateSandboxSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(128),
  tier: SandboxTierSchema.optional().default("developer"),
  quotaOverrides: SandboxQuotaSchema.partial().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type CreateSandbox = z.infer<typeof CreateSandboxSchema>;

export const SandboxLifecycleEventSchema = z.object({
  sandboxId: z.string(),
  event: z.enum(["created", "activated", "suspended", "resumed", "terminated", "reset"]),
  reason: z.string().optional(),
  actor: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type SandboxLifecycleEvent = z.infer<typeof SandboxLifecycleEventSchema>;

export const SandboxUsageSchema = z.object({
  sandboxId: z.string(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  requestCount: z.number().int().nonnegative(),
  storageUsedMb: z.number().nonnegative(),
});
export type SandboxUsage = z.infer<typeof SandboxUsageSchema>;
