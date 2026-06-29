// Dashboard data assembler — composes metrics, trends, and summaries for UI

import { Result, ok, err } from "@veritas/core";
import { AppError } from "@veritas/core";
import { AnalyticsReport, AnalyticsReportPeriod, VerdictDistribution } from "./report.js";
import { MetricSeries } from "./report.js";
import { FunnelResult } from "./funnel.js";
import { RetentionCohort } from "./retention.js";
import { VerificationUsageStats } from "./usage-stats.js";

export interface DashboardWidget {
  readonly id: string;
  readonly title: string;
  readonly type: "metric" | "chart" | "table" | "funnel" | "retention";
  readonly data: unknown;
}

export interface DashboardOverview {
  readonly totalVerifications: number;
  readonly totalClaims: number;
  readonly averageConfidence: number;
  readonly verdictDistribution: VerdictDistribution;
  readonly changeVsLastPeriod: {
    readonly verifications: number;
    readonly claims: number;
    readonly confidence: number;
  };
}

export interface DashboardData {
  readonly organizationId: string;
  readonly period: AnalyticsReportPeriod;
  readonly generatedAt: string;
  readonly overview: DashboardOverview;
  readonly series: MetricSeries[];
  readonly funnel: FunnelResult | null;
  readonly retention: RetentionCohort | null;
  readonly usageStats: VerificationUsageStats | null;
  readonly widgets: DashboardWidget[];
}

export interface DashboardAssemblerDeps {
  readonly getReport: (
    organizationId: string,
    period: AnalyticsReportPeriod
  ) => Promise<Result<AnalyticsReport, AppError>>;
  readonly getFunnel: (
    organizationId: string,
    period: AnalyticsReportPeriod
  ) => Promise<Result<FunnelResult, AppError>>;
  readonly getRetention: (
    organizationId: string,
    period: AnalyticsReportPeriod
  ) => Promise<Result<RetentionCohort, AppError>>;
  readonly getUsageStats: (
    organizationId: string,
    period: AnalyticsReportPeriod
  ) => Promise<Result<VerificationUsageStats, AppError>>;
}

function buildWidgets(
  report: AnalyticsReport,
  funnel: FunnelResult | null,
  retention: RetentionCohort | null,
  usageStats: VerificationUsageStats | null
): DashboardWidget[] {
  const widgets: DashboardWidget[] = [
    {
      id: "overview-metrics",
      title: "Overview",
      type: "metric",
      data: report.summary,
    },
    {
      id: "verdict-distribution",
      title: "Verdict Distribution",
      type: "chart",
      data: report.summary.verdictDistribution,
    },
    ...report.series.map((s) => ({
      id: `series-${s.name}`,
      title: s.name,
      type: "chart" as const,
      data: s,
    })),
  ];

  if (funnel !== null) {
    widgets.push({ id: "funnel", title: "Verification Funnel", type: "funnel", data: funnel });
  }
  if (retention !== null) {
    widgets.push({ id: "retention", title: "User Retention", type: "retention", data: retention });
  }
  if (usageStats !== null) {
    widgets.push({ id: "usage-stats", title: "Usage Statistics", type: "table", data: usageStats });
  }
  return widgets;
}

export async function assembleDashboard(
  organizationId: string,
  period: AnalyticsReportPeriod,
  deps: DashboardAssemblerDeps
): Promise<Result<DashboardData, AppError>> {
  const reportResult = await deps.getReport(organizationId, period);
  if (reportResult.ok === false) return err(reportResult.error);

  const report = reportResult.value;

  const [funnelResult, retentionResult, usageResult] = await Promise.all([
    deps.getFunnel(organizationId, period),
    deps.getRetention(organizationId, period),
    deps.getUsageStats(organizationId, period),
  ]);

  const funnel = funnelResult.ok ? funnelResult.value : null;
  const retention = retentionResult.ok ? retentionResult.value : null;
  const usageStats = usageResult.ok ? usageResult.value : null;

  const overview: DashboardOverview = {
    totalVerifications: report.summary.totalVerifications,
    totalClaims: report.summary.totalClaims,
    averageConfidence: report.summary.averageConfidence,
    verdictDistribution: report.summary.verdictDistribution,
    changeVsLastPeriod: { verifications: 0, claims: 0, confidence: 0 },
  };

  const dashboard: DashboardData = {
    organizationId,
    period,
    generatedAt: new Date().toISOString(),
    overview,
    series: report.series,
    funnel,
    retention,
    usageStats,
    widgets: buildWidgets(report, funnel, retention, usageStats),
  };

  return ok(dashboard);
}
