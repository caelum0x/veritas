// Usage entity: a metered usage record (verifications/claims) for billing.

import { z } from "zod";
import { idSchema, timestampsSchema, metadataSchema } from "./common.js";

export const UsageMetricSchema = z.enum([
  "VERIFICATIONS",
  "CLAIMS",
  "SOURCES",
  "TOKENS",
]);
export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const UsageSchema = z
  .object({
    id: idSchema("usg"),
    organizationId: idSchema("org"),
    subscriptionId: idSchema("sub").nullable(),
    metric: UsageMetricSchema,
    quantity: z.number().int().min(0),
    recordedAt: z.string(),
    idempotencyKey: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Usage = z.infer<typeof UsageSchema>;

export const CreateUsageSchema = z.object({
  organizationId: idSchema("org"),
  subscriptionId: idSchema("sub").nullable().optional(),
  metric: UsageMetricSchema,
  quantity: z.number().int().min(0),
  idempotencyKey: z.string().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateUsage = z.infer<typeof CreateUsageSchema>;
