// Developer portal quota view — per-app rate limits, quota caps, and current consumption
import { z } from "zod";
import { ApiKeyScopeSchema } from "./api-key.js";

export const QuotaWindowSchema = z.enum(["minute", "hour", "day", "month"]);
export type QuotaWindow = z.infer<typeof QuotaWindowSchema>;

export const QuotaLimitSchema = z.object({
  scope: ApiKeyScopeSchema.or(z.literal("*")),
  window: QuotaWindowSchema,
  limit: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetsAt: z.string(),
});
export type QuotaLimit = z.infer<typeof QuotaLimitSchema>;

export const AppQuotaViewSchema = z.object({
  appId: z.string(),
  organizationId: z.string(),
  planId: z.string(),
  limits: z.array(QuotaLimitSchema),
  isThrottled: z.boolean(),
  throttledUntil: z.string().optional(),
  observedAt: z.string(),
});
export type AppQuotaView = z.infer<typeof AppQuotaViewSchema>;

export const QuotaBreachSchema = z.object({
  appId: z.string(),
  scope: ApiKeyScopeSchema.or(z.literal("*")),
  window: QuotaWindowSchema,
  limit: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  exceededAt: z.string(),
});
export type QuotaBreach = z.infer<typeof QuotaBreachSchema>;

export function makeQuotaLimit(
  scope: QuotaLimit["scope"],
  window: QuotaWindow,
  limit: number,
  used: number,
  resetsAt: string,
): QuotaLimit {
  return {
    scope,
    window,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt,
  };
}

export function isQuotaExhausted(quota: QuotaLimit): boolean {
  return quota.remaining === 0;
}

export function quotaUsagePercent(quota: QuotaLimit): number {
  return quota.limit === 0 ? 1 : quota.used / quota.limit;
}

export function findBreachedQuotas(view: AppQuotaView): QuotaLimit[] {
  return view.limits.filter(isQuotaExhausted);
}

export function criticalQuotas(view: AppQuotaView, thresholdPercent = 0.9): QuotaLimit[] {
  return view.limits.filter((q) => quotaUsagePercent(q) >= thresholdPercent);
}
