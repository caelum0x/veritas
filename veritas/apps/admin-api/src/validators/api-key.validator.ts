// Zod validators for API key admin endpoints
import { z } from "zod";

export const listApiKeysSchema = z.object({
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  isActive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getApiKeySchema = z.object({
  id: z.string().min(1),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(128),
  organizationId: z.string().min(1),
  userId: z.string().min(1).optional(),
  scopes: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string()).optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  scopes: z.array(z.string().min(1)).min(1).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string()).optional(),
});

export const revokeApiKeySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ListApiKeysInput = z.infer<typeof listApiKeysSchema>;
export type GetApiKeyInput = z.infer<typeof getApiKeySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
