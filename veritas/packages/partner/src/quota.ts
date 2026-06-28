// Partner quotas: usage ceilings and current consumption tracking per partner.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

export type PartnerQuotaId = Id<"pquota">;

export function newPartnerQuotaId(): PartnerQuotaId {
  return newId("pquota");
}

export const QuotaWindowSchema = z.enum(["minute", "hour", "day", "month"]);
export type QuotaWindow = z.infer<typeof QuotaWindowSchema>;

export const QuotaMetricSchema = z.enum([
  "api_requests",
  "verification_jobs",
  "bulk_exports",
  "webhook_deliveries",
  "report_generations",
]);
export type QuotaMetric = z.infer<typeof QuotaMetricSchema>;

export const PartnerQuotaSchema = z.object({
  id: z.string().startsWith("pquota_"),
  partnerId: z.string().startsWith("partner_"),
  metric: QuotaMetricSchema,
  window: QuotaWindowSchema,
  limit: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  windowStartsAt: z.string().datetime(),
  windowEndsAt: z.string().datetime(),
  alertThresholdPercent: z.number().min(0).max(100).nullable(),
  alertedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PartnerQuota = z.infer<typeof PartnerQuotaSchema>;

export const CreatePartnerQuotaSchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  metric: QuotaMetricSchema,
  window: QuotaWindowSchema,
  limit: z.number().int().positive(),
  windowStartsAt: z.string().datetime(),
  windowEndsAt: z.string().datetime(),
  alertThresholdPercent: z.number().min(0).max(100).nullable().optional(),
});
export type CreatePartnerQuota = z.infer<typeof CreatePartnerQuotaSchema>;

export const QuotaIncrementSchema = z.object({
  amount: z.number().int().positive(),
  recordedAt: z.string().datetime(),
});
export type QuotaIncrement = z.infer<typeof QuotaIncrementSchema>;

export function makePartnerQuota(input: CreatePartnerQuota, now: string): PartnerQuota {
  return {
    id: newPartnerQuotaId() as string,
    partnerId: input.partnerId,
    metric: input.metric,
    window: input.window,
    limit: input.limit,
    used: 0,
    windowStartsAt: input.windowStartsAt,
    windowEndsAt: input.windowEndsAt,
    alertThresholdPercent: input.alertThresholdPercent ?? null,
    alertedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function incrementQuota(
  quota: PartnerQuota,
  increment: QuotaIncrement,
): PartnerQuota {
  return {
    ...quota,
    used: quota.used + increment.amount,
    updatedAt: increment.recordedAt,
  };
}

export function resetQuota(
  quota: PartnerQuota,
  newWindowStartsAt: string,
  newWindowEndsAt: string,
  now: string,
): PartnerQuota {
  return {
    ...quota,
    used: 0,
    windowStartsAt: newWindowStartsAt,
    windowEndsAt: newWindowEndsAt,
    alertedAt: null,
    updatedAt: now,
  };
}

export function isQuotaExceeded(quota: PartnerQuota): boolean {
  return quota.used >= quota.limit;
}

export function quotaUsagePercent(quota: PartnerQuota): number {
  return quota.limit === 0 ? 100 : (quota.used / quota.limit) * 100;
}

export function shouldAlert(quota: PartnerQuota): boolean {
  if (quota.alertThresholdPercent === null) return false;
  if (quota.alertedAt !== null) return false;
  return quotaUsagePercent(quota) >= quota.alertThresholdPercent;
}

export function markQuotaAlerted(quota: PartnerQuota, alertedAt: string): PartnerQuota {
  return { ...quota, alertedAt, updatedAt: alertedAt };
}

export function remainingQuota(quota: PartnerQuota): number {
  return Math.max(0, quota.limit - quota.used);
}
