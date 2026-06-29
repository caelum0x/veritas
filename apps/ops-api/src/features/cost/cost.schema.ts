// Zod request/response schemas for all cost feature HTTP boundaries.
import { z } from "zod";
import { CostEventKindSchema, BudgetScopeSchema, BudgetPeriodSchema, AlertSeveritySchema } from "@veritas/cost";

export const ListEventsQuerySchema = z.object({
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  cursor: z.string().optional(),
});
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

export const CreateEventBodySchema = z.object({
  kind: CostEventKindSchema,
  tenantId: z.string().min(1),
  featureId: z.string().min(1),
  amountUsdc: z.number().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateEventBody = z.infer<typeof CreateEventBodySchema>;

export const CreateBudgetBodySchema = z.object({
  name: z.string().min(1),
  scope: BudgetScopeSchema,
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  limitUsdc: z.number().positive(),
  period: BudgetPeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type CreateBudgetBody = z.infer<typeof CreateBudgetBodySchema>;

export const ListBudgetsQuerySchema = z.object({
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  activeOnly: z.coerce.boolean().default(false),
});
export type ListBudgetsQuery = z.infer<typeof ListBudgetsQuerySchema>;

export const CreateBudgetAlertBodySchema = z.object({
  budgetId: z.string().min(1),
  thresholdPct: z.number().min(0).max(100),
  severity: AlertSeveritySchema,
});
export type CreateBudgetAlertBody = z.infer<typeof CreateBudgetAlertBodySchema>;

export const AggregateQuerySchema = z.object({
  tenantId: z.string().optional(),
  from: z.string(),
  to: z.string(),
});
export type AggregateQuery = z.infer<typeof AggregateQuerySchema>;

export const ListReportsQuerySchema = z.object({
  tenantId: z.string().optional(),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

export const BuildReportBodySchema = z.object({
  tenantId: z.string().optional(),
  from: z.string(),
  to: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BuildReportBody = z.infer<typeof BuildReportBodySchema>;

export const ListAllocationsQuerySchema = z.object({
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  cursor: z.string().optional(),
});
export type ListAllocationsQuery = z.infer<typeof ListAllocationsQuerySchema>;

export const ListForecastsQuerySchema = z.object({
  tenantId: z.string().optional(),
});
export type ListForecastsQuery = z.infer<typeof ListForecastsQuerySchema>;
