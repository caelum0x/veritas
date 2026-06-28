// Zod request/response schemas for the usage feature HTTP layer.
import { z } from "zod";
import { UsageMetricSchema, CreateUsageSchema } from "@veritas/contracts";

export const usageIdParamSchema = z.object({
  id: z.string().min(1, "Usage record ID is required"),
});
export type UsageIdParam = z.infer<typeof usageIdParamSchema>;

export const listUsageQuerySchema = z.object({
  organizationId: z.string().min(1),
  subscriptionId: z.string().optional(),
  metric: UsageMetricSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListUsageQuery = z.infer<typeof listUsageQuerySchema>;

export const createUsageBodySchema = CreateUsageSchema;
export type CreateUsageBody = z.infer<typeof createUsageBodySchema>;

export const usageSummaryQuerySchema = z.object({
  organizationId: z.string().min(1),
  metric: UsageMetricSchema,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});
export type UsageSummaryQuery = z.infer<typeof usageSummaryQuerySchema>;
