// Input/output DTOs for quota management use-cases.
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";

/** Input DTO for checking whether an organization has remaining quota for a metric. */
export const CheckQuotaInputSchema = z.object({
  organizationId: z.string().min(1),
  metric: UsageMetricSchema,
  requested: z.number().int().positive(),
});
export type CheckQuotaInput = z.infer<typeof CheckQuotaInputSchema>;

/** Input DTO for retrieving the quota status for all metrics in an organization. */
export const GetQuotaStatusInputSchema = z.object({
  organizationId: z.string().min(1),
  subscriptionId: z.string().optional(),
});
export type GetQuotaStatusInput = z.infer<typeof GetQuotaStatusInputSchema>;

/** Input DTO for resetting quota counters (e.g., at billing cycle renewal). */
export const ResetQuotaInputSchema = z.object({
  organizationId: z.string().min(1),
  subscriptionId: z.string().min(1),
  effectiveAt: z.string(),
});
export type ResetQuotaInput = z.infer<typeof ResetQuotaInputSchema>;

/** Input DTO for applying a quota override for a specific metric. */
export const SetQuotaOverrideInputSchema = z.object({
  organizationId: z.string().min(1),
  metric: UsageMetricSchema,
  limit: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});
export type SetQuotaOverrideInput = z.infer<typeof SetQuotaOverrideInputSchema>;

/** Output DTO for a single metric's quota status. */
export const MetricQuotaStatusSchema = z.object({
  metric: UsageMetricSchema,
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  percentUsed: z.number().min(0).max(100),
  overrideActive: z.boolean(),
  resetAt: z.string().nullable(),
});
export type MetricQuotaStatus = z.infer<typeof MetricQuotaStatusSchema>;

/** Output DTO for the quota check result of a single request. */
export const QuotaCheckOutputSchema = z.object({
  organizationId: z.string(),
  metric: UsageMetricSchema,
  requested: z.number().int().nonnegative(),
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
});
export type QuotaCheckOutput = z.infer<typeof QuotaCheckOutputSchema>;

/** Output DTO for the full quota status of an organization. */
export const QuotaStatusOutputSchema = z.object({
  organizationId: z.string(),
  subscriptionId: z.string().nullable(),
  metrics: z.array(MetricQuotaStatusSchema),
  evaluatedAt: z.string(),
});
export type QuotaStatusOutput = z.infer<typeof QuotaStatusOutputSchema>;
