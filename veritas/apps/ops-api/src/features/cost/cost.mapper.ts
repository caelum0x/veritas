// Maps @veritas/cost domain objects to immutable HTTP response shapes.
import type { CostEvent, Budget, BudgetAlert, CostReport, CostForecast, CostAllocation } from "@veritas/cost";
import { toBudgetStatus } from "@veritas/cost";
import type { CostSummary } from "@veritas/cost";

export interface CostEventResponse {
  readonly id: string;
  readonly kind: string;
  readonly tenantId: string;
  readonly featureId: string;
  readonly amountUsdc: number;
  readonly occurredAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface BudgetResponse {
  readonly id: string;
  readonly name: string;
  readonly scope: string;
  readonly tenantId?: string;
  readonly featureId?: string;
  readonly limitUsdc: number;
  readonly spentUsdc: number;
  readonly remainingUsdc: number;
  readonly utilizationPct: number;
  readonly exceeded: boolean;
  readonly period: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BudgetAlertResponse {
  readonly id: string;
  readonly budgetId: string;
  readonly thresholdPct: number;
  readonly severity: string;
  readonly triggered: boolean;
  readonly triggeredAt?: string;
  readonly currentUtilizationPct?: number;
  readonly createdAt: string;
}

export interface CostAllocationResponse {
  readonly id: string;
  readonly tenantId: string;
  readonly featureId?: string;
  readonly costEventId?: string;
  readonly allocatedUsdc?: number;
  readonly allocatedAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CostSummaryResponse {
  readonly tenantId: string;
  readonly feature?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalUsdc: number;
  readonly eventCount: number;
  readonly breakdown: Readonly<Record<string, number>>;
}

export interface CostReportResponse {
  readonly id: string;
  readonly generatedAt: string;
  readonly window: { readonly start: string; readonly end: string };
  readonly grandTotalUsdc: number;
  readonly lines: ReadonlyArray<{
    readonly tenantId: string;
    readonly feature?: string;
    readonly totalUsdc: number;
    readonly eventCount: number;
    readonly breakdown: Readonly<Record<string, number>>;
    readonly budgetStatus?: unknown;
  }>;
  readonly hints: ReadonlyArray<{
    readonly id: string;
    readonly severity: string;
    readonly category: string;
    readonly message: string;
    readonly estimatedSavingsUsdc: number;
  }>;
}

export interface CostForecastResponse {
  readonly id: string;
  readonly tenantId: string;
  readonly featureId?: string;
  readonly generatedAt: string;
  readonly forecastPeriodStart: string;
  readonly forecastPeriodEnd: string;
  readonly projectedTotalUsdc: number;
  readonly confidenceLow: number;
  readonly confidenceHigh: number;
  readonly methodology: string;
}

export function toCostEventResponse(event: CostEvent): CostEventResponse {
  return Object.freeze({
    id: event.id,
    kind: event.kind,
    tenantId: event.tenantId,
    featureId: event.featureId,
    amountUsdc: event.amountUsdc,
    occurredAt: event.occurredAt,
    metadata: Object.freeze({ ...event.metadata }),
  });
}

export function toBudgetResponse(budget: Budget): BudgetResponse {
  const status = toBudgetStatus(budget);
  return Object.freeze({
    id: budget.id,
    name: budget.name,
    scope: budget.scope,
    tenantId: budget.tenantId,
    featureId: budget.featureId,
    limitUsdc: budget.limitUsdc,
    spentUsdc: budget.spentUsdc,
    remainingUsdc: status.remainingUsdc,
    utilizationPct: status.utilizationPct,
    exceeded: status.exceeded,
    period: budget.period,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
    active: budget.active,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  });
}

export function toBudgetAlertResponse(alert: BudgetAlert): BudgetAlertResponse {
  return Object.freeze({
    id: alert.id,
    budgetId: alert.budgetId,
    thresholdPct: alert.thresholdPct,
    severity: alert.severity,
    triggered: alert.triggered,
    triggeredAt: alert.triggeredAt,
    currentUtilizationPct: alert.currentUtilizationPct,
    createdAt: alert.createdAt,
  });
}

export function toCostAllocationResponse(allocation: CostAllocation): CostAllocationResponse {
  return Object.freeze({
    id: allocation.id,
    tenantId: allocation.tenantId,
    featureId: allocation.feature,
    costEventId: allocation.costEventId,
    allocatedUsdc: allocation.allocatedUsdc,
    allocatedAt: allocation.allocatedAt,
    metadata: allocation.metadata ? Object.freeze({ ...allocation.metadata }) : undefined,
  });
}

export function toCostSummaryResponse(summary: CostSummary): CostSummaryResponse {
  return Object.freeze({
    tenantId: summary.tenantId,
    feature: summary.feature,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    totalUsdc: summary.totalUsdc,
    eventCount: summary.eventCount,
    breakdown: Object.freeze({ ...summary.breakdown }),
  });
}

export function toCostReportResponse(report: CostReport): CostReportResponse {
  return Object.freeze({
    id: report.id,
    generatedAt: report.generatedAt,
    window: Object.freeze({ start: report.window.start, end: report.window.end }),
    grandTotalUsdc: report.grandTotalUsdc,
    lines: Object.freeze(
      report.lines.map((l) =>
        Object.freeze({
          tenantId: l.tenantId,
          feature: l.feature,
          totalUsdc: l.totalUsdc,
          eventCount: l.eventCount,
          breakdown: Object.freeze({ ...l.breakdown }),
          budgetStatus: l.budgetStatus,
        }),
      ),
    ),
    hints: Object.freeze(
      report.hints.map((h) =>
        Object.freeze({
          id: h.id,
          severity: h.severity,
          category: h.category,
          message: h.message,
          estimatedSavingsUsdc: h.estimatedSavingsUsdc,
        }),
      ),
    ),
  });
}

export function toCostForecastResponse(forecast: CostForecast): CostForecastResponse {
  return Object.freeze({
    id: forecast.id,
    tenantId: forecast.tenantId,
    featureId: forecast.featureId,
    generatedAt: forecast.generatedAt,
    forecastPeriodStart: forecast.forecastPeriodStart,
    forecastPeriodEnd: forecast.forecastPeriodEnd,
    projectedTotalUsdc: forecast.projectedTotalUsdc,
    confidenceLow: forecast.confidenceLow,
    confidenceHigh: forecast.confidenceHigh,
    methodology: forecast.methodology,
  });
}
