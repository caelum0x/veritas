// Input/output DTOs for usage-metering use-cases.
import { z } from "zod";
import { UsageSchema, CreateUsageSchema, UsageMetricSchema } from "@veritas/contracts";

/** DTO for recording a single usage event. */
export const RecordUsageInputSchema = CreateUsageSchema;
export type RecordUsageInput = z.infer<typeof RecordUsageInputSchema>;

/** DTO for querying usage records for an organization. */
export const ListUsageInputSchema = z.object({
  organizationId: z.string(),
  subscriptionId: z.string().optional(),
  metric: UsageMetricSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListUsageInput = z.infer<typeof ListUsageInputSchema>;

/** DTO for summing usage quantity by metric within a time range. */
export const UsageSummaryInputSchema = z.object({
  organizationId: z.string(),
  metric: UsageMetricSchema,
  from: z.string(),
  to: z.string(),
});
export type UsageSummaryInput = z.infer<typeof UsageSummaryInputSchema>;

/** Output DTO for a usage summary aggregation. */
export const UsageSummaryOutputSchema = z.object({
  organizationId: z.string(),
  metric: UsageMetricSchema,
  from: z.string(),
  to: z.string(),
  totalQuantity: z.number().int().min(0),
});
export type UsageSummaryOutput = z.infer<typeof UsageSummaryOutputSchema>;

/** Output DTO representing a single usage record. */
export const UsageOutputSchema = UsageSchema;
export type UsageOutput = z.infer<typeof UsageOutputSchema>;
