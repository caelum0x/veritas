// Zod request/response schemas for the usage feature endpoints.

import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";

export const RecordUsageBodySchema = z.object({
  organizationId: z.string().min(1),
  metric: UsageMetricSchema,
  quantity: z.number().int().positive(),
  userId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});
export type RecordUsageBody = z.infer<typeof RecordUsageBodySchema>;

export const ListUsageQuerySchema = z.object({
  organizationId: z.string().min(1),
  granularity: z.enum(["day", "month"]).default("month"),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ListUsageQuery = z.infer<typeof ListUsageQuerySchema>;

export const UsageEventResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  metric: UsageMetricSchema,
  quantity: z.number(),
  occurredAt: z.string(),
  metadata: z.record(z.string()),
});
export type UsageEventResponse = z.infer<typeof UsageEventResponseSchema>;

export const PeriodUsageResponseSchema = z.object({
  organizationId: z.string(),
  metric: UsageMetricSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  totalQuantity: z.number(),
  eventCount: z.number(),
});
export type PeriodUsageResponse = z.infer<typeof PeriodUsageResponseSchema>;
