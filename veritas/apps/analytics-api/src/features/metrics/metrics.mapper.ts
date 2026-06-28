// Maps analytics package types to HTTP API response shapes for the metrics feature.
import type { PlatformMetrics, VerificationKpis, EngagementKpis, QualityKpis } from "@veritas/analytics";
import type { AnalyticsReport, MetricSeries } from "@veritas/analytics";
import type { TrustTrendSeries } from "@veritas/analytics";
import type { AnalyticsQueryResult, AnalyticsEvent } from "@veritas/analytics";

export interface VerificationKpisResponse {
  readonly totalVerifications: number;
  readonly successRate: number;
  readonly avgDurationMs: number;
  readonly throughputPerHour: number;
}

export interface EngagementKpisResponse {
  readonly totalApiRequests: number;
  readonly uniqueOrganizations: number;
  readonly activeUsers: number;
  readonly reportsGenerated: number;
}

export interface QualityKpisResponse {
  readonly verdictDistribution: Record<string, number>;
  readonly avgConfidence: number;
  readonly sourceUtilizationRate: number;
}

export interface PlatformMetricsResponse {
  readonly verification: VerificationKpisResponse;
  readonly engagement: EngagementKpisResponse;
  readonly quality: QualityKpisResponse;
}

export function toPlatformMetricsResponse(m: PlatformMetrics): PlatformMetricsResponse {
  return {
    verification: {
      totalVerifications: m.verification.totalVerifications,
      successRate: m.verification.successRate,
      avgDurationMs: m.verification.avgDurationMs,
      throughputPerHour: m.verification.throughputPerHour,
    },
    engagement: {
      totalApiRequests: m.engagement.totalApiRequests,
      uniqueOrganizations: m.engagement.uniqueOrganizations,
      activeUsers: m.engagement.activeUsers,
      reportsGenerated: m.engagement.reportsGenerated,
    },
    quality: {
      verdictDistribution: m.quality.verdictDistribution,
      avgConfidence: m.quality.avgConfidence,
      sourceUtilizationRate: m.quality.sourceUtilizationRate,
    },
  };
}

export interface MetricSeriesResponse {
  readonly name: string;
  readonly unit: string;
  readonly points: ReadonlyArray<{ timestamp: string; value: number; label?: string }>;
  readonly total: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
}

export function toMetricSeriesResponse(s: MetricSeries): MetricSeriesResponse {
  return {
    name: s.name,
    unit: s.unit,
    points: s.points.map((p) => ({ timestamp: p.timestamp, value: p.value, ...(p.label !== undefined ? { label: p.label } : {}) })),
    total: s.total,
    average: s.average,
    min: s.min,
    max: s.max,
  };
}

export interface AnalyticsReportResponse {
  readonly id: string;
  readonly organizationId: string;
  readonly period: { from: string; to: string; granularity: string };
  readonly generatedAt: string;
  readonly summary: {
    readonly totalVerifications: number;
    readonly totalClaims: number;
    readonly totalSources: number;
    readonly totalUsers: number;
    readonly averageConfidence: number;
    readonly averageProcessingMs: number;
    readonly verdictDistribution: unknown;
  };
  readonly series: readonly MetricSeriesResponse[];
}

export function toAnalyticsReportResponse(r: AnalyticsReport): AnalyticsReportResponse {
  return {
    id: r.id,
    organizationId: r.organizationId,
    period: { from: r.period.from, to: r.period.to, granularity: r.period.granularity },
    generatedAt: r.generatedAt,
    summary: {
      totalVerifications: r.summary.totalVerifications,
      totalClaims: r.summary.totalClaims,
      totalSources: r.summary.totalSources,
      totalUsers: r.summary.totalUsers,
      averageConfidence: r.summary.averageConfidence,
      averageProcessingMs: r.summary.averageProcessingMs,
      verdictDistribution: r.summary.verdictDistribution,
    },
    series: r.series.map(toMetricSeriesResponse),
  };
}

export interface TrustTrendsResponse {
  readonly organizationId: string;
  readonly windowDays: number;
  readonly overallTrend: string;
  readonly trendSlope: number;
  readonly points: ReadonlyArray<{
    timestamp: string;
    averageScore: number;
    sampleCount: number;
    minScore: number;
    maxScore: number;
  }>;
}

export function toTrustTrendsResponse(t: TrustTrendSeries): TrustTrendsResponse {
  return {
    organizationId: t.organizationId,
    windowDays: t.windowDays,
    overallTrend: t.overallTrend,
    trendSlope: t.trendSlope,
    points: t.points.map((p) => ({
      timestamp: p.timestamp,
      averageScore: p.averageScore,
      sampleCount: p.sampleCount,
      minScore: p.minScore,
      maxScore: p.maxScore,
    })),
  };
}

export interface EventsListResponse {
  readonly events: readonly AnalyticsEvent[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export function toEventsListResponse(result: AnalyticsQueryResult): EventsListResponse {
  return {
    events: result.events,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  };
}
