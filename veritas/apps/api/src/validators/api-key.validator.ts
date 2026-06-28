// Zod validators for API key request bodies and query params
import { z } from "zod";
import { CreateApiKeySchema } from "@veritas/contracts";

export const createApiKeyBodySchema = CreateApiKeySchema;

export const listApiKeysQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;
export type ListApiKeysQuery = z.infer<typeof listApiKeysQuerySchema>;
export type ApiKeyIdParam = z.infer<typeof apiKeyIdParamSchema>;
