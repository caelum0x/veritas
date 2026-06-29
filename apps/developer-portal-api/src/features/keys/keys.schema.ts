// Zod schemas for keys feature HTTP request/response validation
import { z } from "zod";
import { ApiKeyScopeSchema, ApiKeyStatusSchema, AppEnvironmentSchema } from "@veritas/developer-portal";
import { metadataSchema, nonEmptyString } from "@veritas/contracts";

export const CreateKeyBodySchema = z.object({
  appId: z.string().min(1),
  organizationId: z.string().min(1),
  name: nonEmptyString,
  environment: AppEnvironmentSchema,
  scopes: z.array(ApiKeyScopeSchema).min(1),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  metadata: metadataSchema.default({}),
});
export type CreateKeyBody = z.infer<typeof CreateKeyBodySchema>;

export const KeyIdParamSchema = z.object({ id: z.string().min(1) });
export type KeyIdParam = z.infer<typeof KeyIdParamSchema>;

export const ListKeysQuerySchema = z.object({
  appId: z.string().optional(),
  environment: AppEnvironmentSchema.optional(),
  status: ApiKeyStatusSchema.optional(),
});
export type ListKeysQuery = z.infer<typeof ListKeysQuerySchema>;

export const KeyResponseSchema = z.object({
  id: z.string(),
  appId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  environment: AppEnvironmentSchema,
  scopes: z.array(ApiKeyScopeSchema),
  status: ApiKeyStatusSchema,
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  metadata: metadataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const KeyWithSecretResponseSchema = KeyResponseSchema.extend({
  secret: z.string(),
});
