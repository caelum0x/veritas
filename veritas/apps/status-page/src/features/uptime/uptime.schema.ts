// Zod schemas for uptime feature request/response validation.
import { z } from "zod";

export const UptimeWindowLabelSchema = z.enum(["24h", "7d", "30d", "90d"]);
export type UptimeWindowLabel = z.infer<typeof UptimeWindowLabelSchema>;

export const UptimeResultDtoSchema = z.object({
  componentId: z.string(),
  windowLabel: z.string(),
  uptimePercent: z.number().min(0).max(100),
  totalSamples: z.number().int().nonnegative(),
  healthySamples: z.number().int().nonnegative(),
});
export type UptimeResultDto = z.infer<typeof UptimeResultDtoSchema>;

export const SloEvaluationResultDtoSchema = z.object({
  id: z.string(),
  sloId: z.string(),
  sliName: z.string(),
  windowStartMs: z.number().int().nonnegative(),
  windowEndMs: z.number().int().positive(),
  goodCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  observedRatio: z.number().min(0).max(1),
  targetRatio: z.number().min(0).max(1),
  compliant: z.boolean(),
  errorBudgetConsumedRatio: z.number().min(0),
  evaluatedAt: z.string(),
});
export type SloEvaluationResultDto = z.infer<typeof SloEvaluationResultDtoSchema>;

export const SloReportDtoSchema = z.object({
  id: z.string(),
  sloId: z.string(),
  sliName: z.string(),
  windowStartMs: z.number().int().nonnegative(),
  windowEndMs: z.number().int().positive(),
  totalEvaluations: z.number().int().nonnegative(),
  compliantEvaluations: z.number().int().nonnegative(),
  complianceRate: z.number().min(0).max(1),
  targetRatio: z.number().min(0).max(1),
  avgObservedRatio: z.number().min(0).max(1),
  minObservedRatio: z.number().min(0).max(1),
  maxObservedRatio: z.number().min(0).max(1),
  avgErrorBudgetConsumedRatio: z.number().min(0),
  maxErrorBudgetConsumedRatio: z.number().min(0),
  alertsFired: z.array(z.string()),
  generatedAt: z.string(),
  meetingTarget: z.boolean(),
});
export type SloReportDto = z.infer<typeof SloReportDtoSchema>;

export const ErrorBudgetDtoSchema = z.object({
  sloId: z.string(),
  targetRatio: z.number().min(0).max(1),
  windowDurationMs: z.number().int().positive(),
  totalEvents: z.number().int().nonnegative(),
  goodEvents: z.number().int().nonnegative(),
  badEvents: z.number().int().nonnegative(),
  budgetTotalRatio: z.number(),
  budgetConsumedRatio: z.number(),
  budgetRemainingRatio: z.number(),
  budgetConsumedPct: z.number(),
  isBudgetExhausted: z.boolean(),
  computedAt: z.number().int(),
});
export type ErrorBudgetDto = z.infer<typeof ErrorBudgetDtoSchema>;

export const ComponentUptimeResponseSchema = z.object({
  componentId: z.string(),
  windows: z.array(UptimeResultDtoSchema),
});
export type ComponentUptimeResponse = z.infer<typeof ComponentUptimeResponseSchema>;

export const UptimeSummaryResponseSchema = z.object({
  components: z.array(ComponentUptimeResponseSchema),
  generatedAt: z.string(),
});
export type UptimeSummaryResponse = z.infer<typeof UptimeSummaryResponseSchema>;

export const GetSloEvaluationsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(200)),
});
export type GetSloEvaluationsQuery = z.infer<typeof GetSloEvaluationsQuerySchema>;

export const GetSloReportsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
});
export type GetSloReportsQuery = z.infer<typeof GetSloReportsQuerySchema>;
