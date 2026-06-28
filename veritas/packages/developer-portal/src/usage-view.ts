// Developer portal usage view — aggregated API usage metrics per app and period
import { z } from "zod";
import { ApiKeyScopeSchema } from "./api-key.js";

export const UsagePeriodSchema = z.enum(["hour", "day", "week", "month"]);
export type UsagePeriod = z.infer<typeof UsagePeriodSchema>;

export const EndpointUsageSchema = z.object({
  endpoint: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  requestCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  p99LatencyMs: z.number().nonnegative(),
});
export type EndpointUsage = z.infer<typeof EndpointUsageSchema>;

export const ScopeUsageSchema = z.object({
  scope: ApiKeyScopeSchema,
  requestCount: z.number().int().nonnegative(),
});
export type ScopeUsage = z.infer<typeof ScopeUsageSchema>;

export const AppUsageViewSchema = z.object({
  appId: z.string(),
  organizationId: z.string(),
  period: UsagePeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  totalRequests: z.number().int().nonnegative(),
  successRequests: z.number().int().nonnegative(),
  errorRequests: z.number().int().nonnegative(),
  rateLimitedRequests: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  byEndpoint: z.array(EndpointUsageSchema),
  byScope: z.array(ScopeUsageSchema),
  uniqueApiKeys: z.number().int().nonnegative(),
});
export type AppUsageView = z.infer<typeof AppUsageViewSchema>;

export const UsageTimeSeriesPointSchema = z.object({
  timestamp: z.string(),
  requestCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
});
export type UsageTimeSeriesPoint = z.infer<typeof UsageTimeSeriesPointSchema>;

export const AppUsageTimeSeriesSchema = z.object({
  appId: z.string(),
  period: UsagePeriodSchema,
  points: z.array(UsageTimeSeriesPointSchema),
});
export type AppUsageTimeSeries = z.infer<typeof AppUsageTimeSeriesSchema>;

export function emptyUsageView(
  appId: string,
  organizationId: string,
  period: UsagePeriod,
  periodStart: string,
  periodEnd: string,
): AppUsageView {
  return {
    appId,
    organizationId,
    period,
    periodStart,
    periodEnd,
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    rateLimitedRequests: 0,
    avgLatencyMs: 0,
    byEndpoint: [],
    byScope: [],
    uniqueApiKeys: 0,
  };
}

export function successRate(view: AppUsageView): number {
  if (view.totalRequests === 0) return 1;
  return view.successRequests / view.totalRequests;
}

export function errorRate(view: AppUsageView): number {
  if (view.totalRequests === 0) return 0;
  return view.errorRequests / view.totalRequests;
}
