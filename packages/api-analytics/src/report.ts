// Assembles a full ApiAnalyticsReport from collected events over a time window
import { type IsoTimestamp } from "@veritas/core";
import { type ApiCallEvent } from "./event.js";
import { type TimeWindow, type LatencyPercentiles, type ErrorRateSummary, type TopConsumer, type AnalyticsWindow } from "./types.js";
import { computeTopConsumers, type TopConsumersOptions } from "./top-consumers.js";

export interface EndpointSummary {
  readonly endpoint: string;
  readonly method: string;
  readonly totalRequests: number;
  readonly errorRate: number;
  readonly latency: LatencyPercentiles;
  readonly statusCodes: Readonly<Record<string, number>>;
}

export interface ApiAnalyticsReport {
  readonly window: AnalyticsWindow;
  readonly totalRequests: number;
  readonly totalErrors: number;
  readonly overallErrorRate: number;
  readonly overallLatency: LatencyPercentiles;
  readonly endpoints: readonly EndpointSummary[];
  readonly errorRates: readonly ErrorRateSummary[];
  readonly topConsumers: readonly TopConsumer[];
  readonly uniqueConsumers: number;
  readonly uniqueEndpoints: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
}

function computePercentiles(samples: readonly number[]): LatencyPercentiles {
  if (samples.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const len = sorted.length;
  const pct = (p: number): number => sorted[Math.min(Math.floor(p * len), len - 1)] ?? 0;
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    p50: pct(0.5),
    p75: pct(0.75),
    p90: pct(0.9),
    p95: pct(0.95),
    p99: pct(0.99),
    mean: sum / len,
    min: sorted[0] ?? 0,
    max: sorted[len - 1] ?? 0,
  };
}

function buildEndpointSummaries(events: readonly ApiCallEvent[]): readonly EndpointSummary[] {
  const map = new Map<string, { latencies: number[]; total: number; errors: number; statusCodes: Record<string, number>; method: string }>();

  for (const event of events) {
    const key = `${event.method}:${event.endpoint}`;
    const entry = map.get(key) ?? { latencies: [], total: 0, errors: 0, statusCodes: {}, method: event.method };
    entry.latencies.push(event.latencyMs);
    entry.total += 1;
    if (event.statusCode >= 400) entry.errors += 1;
    const sc = String(event.statusCode);
    entry.statusCodes[sc] = (entry.statusCodes[sc] ?? 0) + 1;
    map.set(key, entry);
  }

  return Array.from(map.entries()).map(([key, entry]) => {
    const endpoint = key.slice(key.indexOf(":") + 1);
    return {
      endpoint,
      method: entry.method,
      totalRequests: entry.total,
      errorRate: entry.total > 0 ? entry.errors / entry.total : 0,
      latency: computePercentiles(entry.latencies),
      statusCodes: { ...entry.statusCodes },
    };
  });
}

function buildErrorRates(endpoints: readonly EndpointSummary[], events: readonly ApiCallEvent[]): readonly ErrorRateSummary[] {
  const errorCodeMap = new Map<string, Record<string, number>>();
  for (const event of events) {
    if (event.statusCode >= 400 && event.errorCode) {
      const key = `${event.method}:${event.endpoint}`;
      const codes = errorCodeMap.get(key) ?? {};
      codes[event.errorCode] = (codes[event.errorCode] ?? 0) + 1;
      errorCodeMap.set(key, codes);
    }
  }

  return endpoints.map((ep) => {
    const key = `${ep.method}:${ep.endpoint}`;
    return {
      endpoint: ep.endpoint,
      totalRequests: ep.totalRequests,
      errorRequests: Math.round(ep.errorRate * ep.totalRequests),
      errorRate: ep.errorRate,
      errorsByCode: { ...(errorCodeMap.get(key) ?? {}) },
    };
  });
}

export interface BuildReportOptions {
  readonly window: TimeWindow;
  readonly windowStart: IsoTimestamp;
  readonly windowEnd: IsoTimestamp;
  readonly topConsumersOptions?: TopConsumersOptions;
}

export function buildReport(events: readonly ApiCallEvent[], options: BuildReportOptions): ApiAnalyticsReport {
  const { window, windowStart, windowEnd, topConsumersOptions } = options;

  const allLatencies = events.map((e) => e.latencyMs);
  const totalErrors = events.filter((e) => e.statusCode >= 400).length;
  const totalRequests = events.length;

  const endpoints = buildEndpointSummaries(events);
  const errorRates = buildErrorRates(endpoints, events);
  const topConsumers = computeTopConsumers(events, topConsumersOptions);

  const uniqueConsumers = new Set(events.map((e) => e.consumerId)).size;
  const uniqueEndpoints = new Set(events.map((e) => `${e.method}:${e.endpoint}`)).size;
  const totalRequestBytes = events.reduce((s, e) => s + e.requestSizeBytes, 0);
  const totalResponseBytes = events.reduce((s, e) => s + e.responseSizeBytes, 0);

  return {
    window: { window, windowStart, windowEnd },
    totalRequests,
    totalErrors,
    overallErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
    overallLatency: computePercentiles(allLatencies),
    endpoints,
    errorRates,
    topConsumers,
    uniqueConsumers,
    uniqueEndpoints,
    totalRequestBytes,
    totalResponseBytes,
  };
}
