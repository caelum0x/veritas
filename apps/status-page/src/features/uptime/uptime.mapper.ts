// Maps SLO and health-aggregation package types to uptime feature HTTP DTOs.
import type { SloEvaluationResult, SloReport, ErrorBudget } from "@veritas/slo";
import { reportIsMeetingTarget } from "@veritas/slo";
import type { UptimeResult } from "../../uptime.js";
import type {
  UptimeResultDto,
  SloEvaluationResultDto,
  SloReportDto,
  ErrorBudgetDto,
  ComponentUptimeResponse,
} from "./uptime.schema.js";

/** Map a single uptime calculation result to DTO. */
export function mapUptimeResult(result: UptimeResult): UptimeResultDto {
  return {
    componentId: result.componentId,
    windowLabel: result.windowLabel,
    uptimePercent: result.uptimePercent,
    totalSamples: result.totalSamples,
    healthySamples: result.healthySamples,
  };
}

/** Map a list of uptime results for one component to the nested DTO shape. */
export function mapComponentUptime(
  componentId: string,
  results: readonly UptimeResult[],
): ComponentUptimeResponse {
  return {
    componentId,
    windows: results.map(mapUptimeResult),
  };
}

/** Map an SloEvaluationResult from @veritas/slo to HTTP DTO. */
export function mapSloEvaluationResult(result: SloEvaluationResult): SloEvaluationResultDto {
  return {
    id: result.id,
    sloId: result.sloId,
    sliName: result.sliName,
    windowStartMs: result.windowStartMs,
    windowEndMs: result.windowEndMs,
    goodCount: result.goodCount,
    totalCount: result.totalCount,
    observedRatio: result.observedRatio,
    targetRatio: result.targetRatio,
    compliant: result.compliant,
    errorBudgetConsumedRatio: result.errorBudgetConsumedRatio,
    evaluatedAt: result.evaluatedAt,
  };
}

/** Map an SloReport from @veritas/slo to HTTP DTO. */
export function mapSloReport(report: SloReport): SloReportDto {
  return {
    id: report.id,
    sloId: report.sloId,
    sliName: report.sliName,
    windowStartMs: report.windowStartMs,
    windowEndMs: report.windowEndMs,
    totalEvaluations: report.totalEvaluations,
    compliantEvaluations: report.compliantEvaluations,
    complianceRate: report.complianceRate,
    targetRatio: report.targetRatio,
    avgObservedRatio: report.avgObservedRatio,
    minObservedRatio: report.minObservedRatio,
    maxObservedRatio: report.maxObservedRatio,
    avgErrorBudgetConsumedRatio: report.avgErrorBudgetConsumedRatio,
    maxErrorBudgetConsumedRatio: report.maxErrorBudgetConsumedRatio,
    alertsFired: [...report.alertsFired],
    generatedAt: report.generatedAt,
    meetingTarget: reportIsMeetingTarget(report),
  };
}

/** Map an ErrorBudget from @veritas/slo to HTTP DTO. */
export function mapErrorBudget(budget: ErrorBudget): ErrorBudgetDto {
  return {
    sloId: budget.sloId,
    targetRatio: budget.targetRatio,
    windowDurationMs: budget.windowDurationMs,
    totalEvents: budget.totalEvents,
    goodEvents: budget.goodEvents,
    badEvents: budget.badEvents,
    budgetTotalRatio: budget.budgetTotalRatio,
    budgetConsumedRatio: budget.budgetConsumedRatio,
    budgetRemainingRatio: budget.budgetRemainingRatio,
    budgetConsumedPct: budget.budgetConsumedPct,
    isBudgetExhausted: budget.isBudgetExhausted,
    computedAt: budget.computedAt,
  };
}
