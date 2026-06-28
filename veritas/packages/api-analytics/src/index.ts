// Public surface re-export for @veritas/api-analytics
export type { ApiCallEvent, HttpMethod } from './event.js';
export type { CollectOptions, Collector } from './collector.js';
export type { EndpointStats, AggregationResult } from './aggregator.js';
export type { LatencyPercentiles } from './latency.js';
export type { ErrorRateStats, OverallErrorRate } from './error-rate.js';
export type { TopConsumer, ConsumerStats, TimeWindow, AnalyticsWindow, ErrorRateSummary } from './types.js';
export type { ApiAnalyticsReport, BuildReportOptions, EndpointSummary } from './report.js';
export type { AnalyticsStore } from './store.js';

export { createCollector } from './collector.js';
export { aggregateByEndpoint } from './aggregator.js';
export { computeLatencyPercentiles } from './latency.js';
export { computeErrorRates } from './error-rate.js';
export { computeTopConsumers } from './top-consumers.js';
export type { TopConsumersOptions, TopConsumerSortKey } from './top-consumers.js';
export { buildReport } from './report.js';
export { createAnalyticsStore, WINDOW_MS } from './store.js';
export {
  AnalyticsStoreError,
  InvalidTimeWindowError,
  ConsumerNotFoundError,
  EndpointNotFoundError,
} from './errors.js';
