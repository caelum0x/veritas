// Analytics report types for structured analytics output

import { z } from "zod";
import { IsoTimestamp } from "@veritas/core";

export const AnalyticsReportPeriodSchema = z.object({
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["hour", "day", "week", "month"]),
});

export type AnalyticsReportPeriod = z.infer<typeof AnalyticsReportPeriodSchema>;

export const MetricSeriesPointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
  label: z.string().optional(),
});

export type MetricSeriesPoint = z.infer<typeof MetricSeriesPointSchema>;

export const MetricSeriesSchema = z.object({
  name: z.string(),
  unit: z.string(),
  points: z.array(MetricSeriesPointSchema),
  total: z.number(),
  average: z.number(),
  min: z.number(),
  max: z.number(),
});

export type MetricSeries = z.infer<typeof MetricSeriesSchema>;

export const VerdictDistributionSchema = z.object({
  true: z.number(),
  false: z.number(),
  unverifiable: z.number(),
  disputed: z.number(),
  total: z.number(),
});

export type VerdictDistribution = z.infer<typeof VerdictDistributionSchema>;

export const AnalyticsReportSummarySchema = z.object({
  totalVerifications: z.number(),
  totalClaims: z.number(),
  totalSources: z.number(),
  totalUsers: z.number(),
  averageConfidence: z.number(),
  averageProcessingMs: z.number(),
  verdictDistribution: VerdictDistributionSchema,
});

export type AnalyticsReportSummary = z.infer<typeof AnalyticsReportSummarySchema>;

export const AnalyticsReportSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  period: AnalyticsReportPeriodSchema,
  generatedAt: z.string(),
  summary: AnalyticsReportSummarySchema,
  series: z.array(MetricSeriesSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type AnalyticsReport = z.infer<typeof AnalyticsReportSchema>;

export function makeAnalyticsReport(
  params: Omit<AnalyticsReport, "generatedAt">
): AnalyticsReport {
  return {
    ...params,
    generatedAt: new Date().toISOString() as IsoTimestamp,
  };
}

export function computeMetricSeries(
  name: string,
  unit: string,
  points: MetricSeriesPoint[]
): MetricSeries {
  const values = points.map((p) => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const average = values.length > 0 ? total / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  return { name, unit, points, total, average, min, max };
}
