// ApiKey entity: a hashed REST API credential bound to an org/user.

import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

export const ApiKeySchema = z
  .object({
    id: idSchema("key"),
    organizationId: idSchema("org"),
    userId: idSchema("user").nullable(),
    name: z.string(),
    prefix: z.string(),
    hashedKey: z.string(),
    scopes: z.array(z.string()),
    lastUsedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    revokedAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const CreateApiKeySchema = z.object({
  organizationId: idSchema("org"),
  userId: idSchema("user").nullable().optional(),
  name: z.string(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().nullable().optional(),
});
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;

/** Returned exactly once at creation, including the plaintext key. */
export const ApiKeyWithSecretSchema = ApiKeySchema.extend({
  secret: z.string(),
});
export type ApiKeyWithSecret = z.infer<typeof ApiKeyWithSecretSchema>;
