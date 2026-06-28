// Maps domain usage/analytics types to HTTP response shapes
import type { AppUsageView, AppUsageTimeSeries, AppQuotaView } from "@veritas/developer-portal";
import type { ApiAnalyticsReport } from "@veritas/api-analytics";

export interface UsageSummaryResponse {
  readonly appId: string;
  readonly organizationId: string;
  readonly period: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalRequests: number;
  readonly successRequests: number;
  readonly errorRequests: number;
  readonly rateLimitedRequests: number;
  readonly avgLatencyMs: number;
  readonly byEndpoint: ReadonlyArray<{
    readonly endpoint: string;
    readonly method: string;
    readonly requestCount: number;
    readonly successCount: number;
    readonly errorCount: number;
    readonly avgLatencyMs: number;
    readonly p99LatencyMs: number;
  }>;
  readonly uniqueApiKeys: number;
}

export interface TimeSeriesResponse {
  readonly appId: string;
  readonly period: string;
  readonly points: ReadonlyArray<{
    readonly timestamp: string;
    readonly requestCount: number;
    readonly errorCount: number;
    readonly avgLatencyMs: number;
  }>;
}

export interface QuotaResponse {
  readonly appId: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly isThrottled: boolean;
  readonly throttledUntil?: string;
  readonly observedAt: string;
  readonly limits: ReadonlyArray<{
    readonly scope: string;
    readonly window: string;
    readonly limit: number;
    readonly used: number;
    readonly remaining: number;
    readonly resetsAt: string;
  }>;
}

export interface AnalyticsReportResponse {
  readonly window: { readonly window: string; readonly windowStart: string; readonly windowEnd: string };
  readonly totalRequests: number;
  readonly totalErrors: number;
  readonly overallErrorRate: number;
  readonly uniqueConsumers: number;
  readonly uniqueEndpoints: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
  readonly overallLatency: {
    readonly p50: number;
    readonly p75: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
    readonly mean: number;
  };
  readonly endpoints: ReadonlyArray<{
    readonly endpoint: string;
    readonly method: string;
    readonly totalRequests: number;
    readonly errorRate: number;
  }>;
  readonly topConsumers: ReadonlyArray<{
    readonly consumerId: string;
    readonly totalRequests: number;
    readonly errorRate: number;
    readonly avgLatencyMs: number;
  }>;
}

export function mapUsageSummary(view: AppUsageView): UsageSummaryResponse {
  return {
    appId: view.appId,
    organizationId: view.organizationId,
    period: view.period,
    periodStart: view.periodStart,
    periodEnd: view.periodEnd,
    totalRequests: view.totalRequests,
    successRequests: view.successRequests,
    errorRequests: view.errorRequests,
    rateLimitedRequests: view.rateLimitedRequests,
    avgLatencyMs: view.avgLatencyMs,
    byEndpoint: view.byEndpoint.map((ep) => ({
      endpoint: ep.endpoint,
      method: ep.method,
      requestCount: ep.requestCount,
      successCount: ep.successCount,
      errorCount: ep.errorCount,
      avgLatencyMs: ep.avgLatencyMs,
      p99LatencyMs: ep.p99LatencyMs,
    })),
    uniqueApiKeys: view.uniqueApiKeys,
  };
}

export function mapTimeSeries(series: AppUsageTimeSeries): TimeSeriesResponse {
  return {
    appId: series.appId,
    period: series.period,
    points: series.points.map((p) => ({
      timestamp: p.timestamp,
      requestCount: p.requestCount,
      errorCount: p.errorCount,
      avgLatencyMs: p.avgLatencyMs,
    })),
  };
}

export function mapQuota(quota: AppQuotaView): QuotaResponse {
  return {
    appId: quota.appId,
    organizationId: quota.organizationId,
    planId: quota.planId,
    isThrottled: quota.isThrottled,
    throttledUntil: quota.throttledUntil,
    observedAt: quota.observedAt,
    limits: quota.limits.map((l) => ({
      scope: l.scope,
      window: l.window,
      limit: l.limit,
      used: l.used,
      remaining: l.remaining,
      resetsAt: l.resetsAt,
    })),
  };
}

export function mapAnalyticsReport(report: ApiAnalyticsReport): AnalyticsReportResponse {
  return {
    window: {
      window: report.window.window,
      windowStart: report.window.windowStart,
      windowEnd: report.window.windowEnd,
    },
    totalRequests: report.totalRequests,
    totalErrors: report.totalErrors,
    overallErrorRate: report.overallErrorRate,
    uniqueConsumers: report.uniqueConsumers,
    uniqueEndpoints: report.uniqueEndpoints,
    totalRequestBytes: report.totalRequestBytes,
    totalResponseBytes: report.totalResponseBytes,
    overallLatency: {
      p50: report.overallLatency.p50,
      p75: report.overallLatency.p75,
      p90: report.overallLatency.p90,
      p95: report.overallLatency.p95,
      p99: report.overallLatency.p99,
      mean: report.overallLatency.mean,
    },
    endpoints: report.endpoints.map((ep) => ({
      endpoint: ep.endpoint,
      method: ep.method,
      totalRequests: ep.totalRequests,
      errorRate: ep.errorRate,
    })),
    topConsumers: report.topConsumers.map((c) => ({
      consumerId: c.consumerId,
      totalRequests: c.totalRequests,
      errorRate: c.errorRate,
      avgLatencyMs: c.avgLatencyMs,
    })),
  };
}
