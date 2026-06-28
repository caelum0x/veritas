// Zod validators for usage request bodies and query parameters.
import { z } from "zod";
import { CreateUsageSchema, UsageMetricSchema } from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createUsageBodySchema = CreateUsageSchema;

export const listUsageQuerySchema = paginationSchema.extend({
  metric: UsageMetricSchema.optional(),
  orgId: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const usageIdParamSchema = z.object({
  id: z.string().min(1, "Usage record ID is required"),
});

export const orgUsageParamSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
});

export type CreateUsageBody = z.infer<typeof createUsageBodySchema>;
export type ListUsageQuery = z.infer<typeof listUsageQuerySchema>;
export type UsageIdParam = z.infer<typeof usageIdParamSchema>;
export type OrgUsageParam = z.infer<typeof orgUsageParamSchema>;
