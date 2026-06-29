// Public surface of @veritas/analytics — re-exports all analytics primitives
export type { AnalyticsEvent, AnalyticsEventType, CreateAnalyticsEvent } from "./event.js";
export { AnalyticsEventTypeSchema, AnalyticsEventSchema } from "./event.js";

export type { Tracker, TrackerConfig } from "./tracker.js";
export { DefaultTracker } from "./tracker.js";

export type { TimeBucket, AggregationOptions, BucketGranularity } from "./aggregator.js";
export { aggregateEvents } from "./aggregator.js";

export type {
  VerificationKpis,
  EngagementKpis,
  QualityKpis,
  PlatformMetrics,
} from "./metrics.js";
export {
  computeVerificationKpis,
  computeEngagementKpis,
  computeQualityKpis,
  computePlatformMetrics,
} from "./metrics.js";

export type { DailyRollup, MonthlyRollup } from "./rollup.js";
export { buildDailyRollups, buildMonthlyRollup, buildMonthlyRollups } from "./rollup.js";

export type {
  AnalyticsReport,
  AnalyticsReportPeriod,
  MetricSeries,
  MetricSeriesPoint,
  VerdictDistribution,
  AnalyticsReportSummary,
} from "./report.js";
export { makeAnalyticsReport, computeMetricSeries, AnalyticsReportPeriodSchema } from "./report.js";

export type { DashboardData, DashboardWidget, DashboardOverview, DashboardAssemblerDeps } from "./dashboard.js";
export { assembleDashboard } from "./dashboard.js";

export type { FunnelStage, FunnelResult, RawFunnelData } from "./funnel.js";
export { computeFunnel, verificationFunnelStageNames, identifyFunnelBottleneck } from "./funnel.js";

export type { RetentionCohort, RetentionBucket, RawCohortData } from "./retention.js";
export { computeRetentionCohort, mergeRetentionCohorts } from "./retention.js";

export type {
  VerificationUsageStats,
  VerificationUsageBreakdown,
  QuotaStatus,
  RawUsageData,
} from "./usage-stats.js";
export { computeVerificationUsageStats } from "./usage-stats.js";

export type { TrustDataPoint, TrustTrendSeries, TrustTrendOptions } from "./trust-trends.js";
export { computeTrustTrends } from "./trust-trends.js";

export type { AnalyticsStore, AnalyticsStoreOptions } from "./store.js";
export { createAnalyticsStore } from "./store.js";

export type { AnalyticsQuery, AnalyticsQueryResult, QueryBuilder } from "./query.js";
export { analyticsQuery, matchesQuery } from "./query.js";

export {
  AnalyticsStoreError,
  AnalyticsQueryError,
  AnalyticsAggregationError,
  AnalyticsReportError,
} from "./errors.js";
export type { AnalyticsError } from "./errors.js";
