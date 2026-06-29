// Zod request/response schemas for usage feature HTTP endpoints.
import { z } from "zod";
import { UsageMetricSchema, paginationSchema } from "@veritas/contracts";

export const RecordUsageBodySchema = z.object({
  organizationId: z.string().min(1),
  subscriptionId: z.string().nullable().optional(),
  metric: UsageMetricSchema,
  quantity: z.number().int().min(0),
  idempotencyKey: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RecordUsageBody = z.infer<typeof RecordUsageBodySchema>;

export const ListUsageQuerySchema = paginationSchema.extend({
  organizationId: z.string().optional(),
  subscriptionId: z.string().optional(),
  metric: UsageMetricSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListUsageQuery = z.infer<typeof ListUsageQuerySchema>;

export const UsageSummaryQuerySchema = z.object({
  metric: UsageMetricSchema,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});
export type UsageSummaryQuery = z.infer<typeof UsageSummaryQuerySchema>;

export const UsageIdParamSchema = z.object({ id: z.string().min(1) });
export type UsageIdParam = z.infer<typeof UsageIdParamSchema>;
