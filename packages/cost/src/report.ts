// Cost report: assembles a structured cost report from summaries and hints
import type { IsoTimestamp } from "@veritas/core";
import type { CostSummary, AggregationWindow } from "./aggregator.js";
import type { OptimizationHint } from "./optimizer.js";
import type { BudgetStatus } from "./budget.js";

export interface CostReportLine {
  readonly tenantId: string;
  readonly feature: string | undefined;
  readonly totalUsdc: number;
  readonly eventCount: number;
  readonly breakdown: Record<string, number>;
  readonly budgetStatus: BudgetStatus | undefined;
}

export interface CostReport {
  readonly id: string;
  readonly generatedAt: IsoTimestamp;
  readonly window: AggregationWindow;
  readonly lines: readonly CostReportLine[];
  readonly grandTotalUsdc: number;
  readonly hints: readonly OptimizationHint[];
  readonly metadata: Record<string, unknown>;
}

export interface CostReportBuilder {
  build(params: {
    id: string;
    window: AggregationWindow;
    summaries: readonly CostSummary[];
    hints: readonly OptimizationHint[];
    budgetStatuses?: readonly BudgetStatus[];
    metadata?: Record<string, unknown>;
  }): CostReport;
}

function findBudgetStatus(
  statuses: readonly BudgetStatus[],
  tenantId: string,
  feature: string | undefined
): BudgetStatus | undefined {
  return statuses.find(
    (s) => s.tenantId === tenantId && s.feature === feature
  );
}

export function createCostReportBuilder(): CostReportBuilder {
  function build({
    id,
    window,
    summaries,
    hints,
    budgetStatuses = [],
    metadata = {},
  }: {
    id: string;
    window: AggregationWindow;
    summaries: readonly CostSummary[];
    hints: readonly OptimizationHint[];
    budgetStatuses?: readonly BudgetStatus[];
    metadata?: Record<string, unknown>;
  }): CostReport {
    const lines: CostReportLine[] = summaries.map((s) => ({
      tenantId: s.tenantId,
      feature: s.feature,
      totalUsdc: s.totalUsdc,
      eventCount: s.eventCount,
      breakdown: s.breakdown,
      budgetStatus: findBudgetStatus(budgetStatuses, s.tenantId, s.feature),
    }));

    const grandTotalUsdc = lines.reduce((acc, l) => acc + l.totalUsdc, 0);

    return {
      id,
      generatedAt: new Date().toISOString() as IsoTimestamp,
      window,
      lines,
      grandTotalUsdc,
      hints,
      metadata,
    };
  }

  return { build };
}
