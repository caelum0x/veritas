// Zod schemas for usage feature request/response validation
import { z } from "zod";
import { UsagePeriodSchema } from "@veritas/developer-portal";

export const GetUsageSummaryQuerySchema = z.object({
  appId: z.string().min(1).optional(),
  period: UsagePeriodSchema.default("day"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type GetUsageSummaryQuery = z.infer<typeof GetUsageSummaryQuerySchema>;

export const GetUsageTimeSeriesQuerySchema = z.object({
  appId: z.string().min(1).optional(),
  period: UsagePeriodSchema.default("hour"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type GetUsageTimeSeriesQuery = z.infer<typeof GetUsageTimeSeriesQuerySchema>;

export const GetQuotaQuerySchema = z.object({
  appId: z.string().min(1).optional(),
});
export type GetQuotaQuery = z.infer<typeof GetQuotaQuerySchema>;

export const GetAnalyticsReportQuerySchema = z.object({
  appId: z.string().min(1).optional(),
  window: z.enum(["1m", "5m", "15m", "1h", "6h", "24h", "7d", "30d"]).default("24h"),
});
export type GetAnalyticsReportQuery = z.infer<typeof GetAnalyticsReportQuerySchema>;
