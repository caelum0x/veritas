// Shared value types, port interfaces, and secondary domain types for the cost module
import { z } from "zod";
import type { Result } from "@veritas/core";
import type { CostEvent } from "./cost-event.js";
import type { Budget } from "./budget.js";
import type { BudgetAlert } from "./alert.js";
import type { CostReport } from "./report.js";
import type {
  BudgetNotFoundError,
  AllocationNotFoundError,
  CostEventNotFoundError,
  CostStoreError,
} from "./errors.js";

// ─── CostAllocation (flat allocation record persisted by store) ───────────────

export const CostAllocationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  feature: z.string().optional(),
  costEventId: z.string(),
  allocatedUsdc: z.number().nonnegative(),
  allocatedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CostAllocation = z.infer<typeof CostAllocationSchema>;

// ─── CostForecast ─────────────────────────────────────────────────────────────

export const CostForecastSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  featureId: z.string().optional(),
  generatedAt: z.string(),
  forecastPeriodStart: z.string(),
  forecastPeriodEnd: z.string(),
  projectedTotalUsdc: z.number().nonnegative(),
  confidenceLow: z.number().nonnegative(),
  confidenceHigh: z.number().nonnegative(),
  methodology: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CostForecast = z.infer<typeof CostForecastSchema>;

// ─── Query ────────────────────────────────────────────────────────────────────

export const CostQuerySchema = z.object({
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(500).default(100),
  cursor: z.string().optional(),
});
export type CostQuery = z.infer<typeof CostQuerySchema>;

// ─── Port: CostStore ─────────────────────────────────────────────────────────

export type CostStoreWriteError = CostStoreError;
export type CostStoreReadError = CostStoreError | CostEventNotFoundError;

export interface CostStore {
  // Cost events
  saveEvent(event: CostEvent): Promise<Result<CostEvent, CostStoreWriteError>>;
  getEvent(id: string): Promise<Result<CostEvent, CostStoreReadError>>;
  listEvents(query: CostQuery): Promise<Result<readonly CostEvent[], CostStoreReadError>>;

  // Allocations
  saveAllocation(allocation: CostAllocation): Promise<Result<CostAllocation, CostStoreWriteError>>;
  getAllocation(id: string): Promise<Result<CostAllocation, CostStoreReadError | AllocationNotFoundError>>;
  listAllocations(query: CostQuery): Promise<Result<readonly CostAllocation[], CostStoreReadError>>;

  // Budgets
  saveBudget(budget: Budget): Promise<Result<Budget, CostStoreWriteError>>;
  getBudget(id: string): Promise<Result<Budget, CostStoreReadError | BudgetNotFoundError>>;
  listBudgets(tenantId?: string): Promise<Result<readonly Budget[], CostStoreReadError>>;

  // Alerts
  saveAlert(alert: BudgetAlert): Promise<Result<BudgetAlert, CostStoreWriteError>>;
  listAlerts(budgetId?: string): Promise<Result<readonly BudgetAlert[], CostStoreReadError>>;

  // Reports & Forecasts
  saveReport(report: CostReport): Promise<Result<CostReport, CostStoreWriteError>>;
  listReports(tenantId?: string): Promise<Result<readonly CostReport[], CostStoreReadError>>;
  saveForecast(forecast: CostForecast): Promise<Result<CostForecast, CostStoreWriteError>>;
  listForecasts(tenantId?: string): Promise<Result<readonly CostForecast[], CostStoreReadError>>;
}

// ─── Aggregated spend snapshot ────────────────────────────────────────────────

export const SpendSnapshotSchema = z.object({
  tenantId: z.string(),
  featureId: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalUsdc: z.number().nonnegative(),
  eventCount: z.number().int().nonnegative(),
});
export type SpendSnapshot = z.infer<typeof SpendSnapshotSchema>;
