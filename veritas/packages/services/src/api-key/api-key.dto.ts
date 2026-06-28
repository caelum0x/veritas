// Input/output DTOs for api-key application service use-cases.
import { z } from "zod";
import {
  ApiKeySchema,
  CreateApiKeySchema,
  ApiKeyWithSecretSchema,
} from "@veritas/contracts";

/** Input DTO for issuing a new API key for an organization. */
export const IssueApiKeyInputSchema = CreateApiKeySchema;
export type IssueApiKeyInput = z.infer<typeof IssueApiKeyInputSchema>;

/** Query options for listing API keys. */
export const ListApiKeysInputSchema = z.object({
  organizationId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListApiKeysInput = z.infer<typeof ListApiKeysInputSchema>;

/** Input DTO for revoking an API key by its ID. */
export const RevokeApiKeyInputSchema = z.object({
  keyId: z.string().min(1),
});
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeyInputSchema>;

/** Input DTO for validating a raw API key string (used at auth layer). */
export const ValidateApiKeyInputSchema = z.object({
  rawKey: z.string().min(1),
});
export type ValidateApiKeyInput = z.infer<typeof ValidateApiKeyInputSchema>;

/** Output DTO: an API key without the plaintext secret (post-creation view). */
export const ApiKeyOutputSchema = ApiKeySchema;
export type ApiKeyOutput = z.infer<typeof ApiKeyOutputSchema>;

/** Output DTO: returned once at key creation, includes the one-time plaintext secret. */
export const ApiKeyCreatedOutputSchema = ApiKeyWithSecretSchema;
export type ApiKeyCreatedOutput = z.infer<typeof ApiKeyCreatedOutputSchema>;

/** Output DTO: paginated list of API keys. */
export const ApiKeyListOutputSchema = z.object({
  items: z.array(ApiKeySchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type ApiKeyListOutput = z.infer<typeof ApiKeyListOutputSchema>;

/** Output DTO: result of validating a raw key. */
export const ValidateApiKeyOutputSchema = z.object({
  valid: z.boolean(),
  apiKey: ApiKeySchema.nullable(),
});
export type ValidateApiKeyOutput = z.infer<typeof ValidateApiKeyOutputSchema>;
