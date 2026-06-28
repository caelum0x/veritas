// Maps internal dashboard/analytics types to HTTP API response shapes.
import type { LocalDashboard } from "../../bootstrap.js";
import type { DashboardData } from "@veritas/analytics";

export interface DashboardResponse {
  readonly id: string;
  readonly orgId: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly visibility: string;
  readonly refreshInterval: string | undefined;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export function toDashboardResponse(d: LocalDashboard): DashboardResponse {
  return {
    id: d.id,
    orgId: d.orgId,
    title: d.title,
    description: typeof d["description"] === "string" ? d["description"] : undefined,
    visibility: d.visibility,
    refreshInterval: typeof d["refreshInterval"] === "string" ? d["refreshInterval"] : undefined,
    tags: d.tags,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    archivedAt: d.archivedAt,
  };
}

export interface DashboardListResponse {
  readonly items: readonly DashboardResponse[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export function toDashboardListResponse(
  items: readonly LocalDashboard[],
  total: number,
  limit: number,
  offset: number,
): DashboardListResponse {
  return {
    items: items.map(toDashboardResponse),
    total,
    limit,
    offset,
  };
}

export interface DashboardDataResponse {
  readonly organizationId: string;
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly granularity: string;
  };
  readonly generatedAt: string;
  readonly overview: {
    readonly totalVerifications: number;
    readonly totalClaims: number;
    readonly averageConfidence: number;
    readonly verdictDistribution: unknown;
    readonly changeVsLastPeriod: unknown;
  };
  readonly series: readonly unknown[];
  readonly funnel: unknown;
  readonly retention: unknown;
  readonly usageStats: unknown;
  readonly widgets: readonly unknown[];
}

export function toDashboardDataResponse(data: DashboardData): DashboardDataResponse {
  return {
    organizationId: data.organizationId,
    period: {
      from: data.period.from,
      to: data.period.to,
      granularity: data.period.granularity,
    },
    generatedAt: data.generatedAt,
    overview: {
      totalVerifications: data.overview.totalVerifications,
      totalClaims: data.overview.totalClaims,
      averageConfidence: data.overview.averageConfidence,
      verdictDistribution: data.overview.verdictDistribution,
      changeVsLastPeriod: data.overview.changeVsLastPeriod,
    },
    series: data.series,
    funnel: data.funnel,
    retention: data.retention,
    usageStats: data.usageStats,
    widgets: data.widgets,
  };
}
