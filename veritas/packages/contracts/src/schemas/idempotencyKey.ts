// IdempotencyKey entity: dedupes mutating requests by caching their first result.

import { z } from "zod";
import { idSchema, timestampsSchema, hashSchema } from "./common.js";

export const IdempotencyKeyStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);
export type IdempotencyKeyStatus = z.infer<
  typeof IdempotencyKeyStatusSchema
>;

export const IdempotencyKeySchema = z
  .object({
    id: idSchema("idm"),
    key: z.string(),
    organizationId: idSchema("org").nullable(),
    method: z.string(),
    path: z.string(),
    requestHash: hashSchema,
    status: IdempotencyKeyStatusSchema,
    responseStatus: z.number().int().nullable(),
    responseBody: z.unknown().nullable(),
    expiresAt: z.string(),
  })
  .merge(timestampsSchema);
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

export const CreateIdempotencyKeySchema = z.object({
  key: z.string(),
  organizationId: idSchema("org").nullable().optional(),
  method: z.string(),
  path: z.string(),
  requestHash: hashSchema,
  expiresAt: z.string(),
});
export type CreateIdempotencyKey = z.infer<
  typeof CreateIdempotencyKeySchema
>;
