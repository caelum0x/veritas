// Shared types for api-analytics: time windows, consumer summaries, and endpoint stats
import { type IsoTimestamp } from "@veritas/core";

export type TimeWindow = "1m" | "5m" | "15m" | "1h" | "6h" | "24h" | "7d" | "30d";

export interface EndpointStats {
  readonly endpoint: string;
  readonly method: string;
  readonly totalRequests: number;
  readonly successRequests: number;
  readonly errorRequests: number;
  readonly totalLatencyMs: number;
  readonly minLatencyMs: number;
  readonly maxLatencyMs: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
  readonly latencySamples: readonly number[];
  readonly statusCodes: Readonly<Record<string, number>>;
  readonly errorCodes: Readonly<Record<string, number>>;
}

export interface ConsumerStats {
  readonly consumerId: string;
  readonly apiKeyId: string;
  readonly totalRequests: number;
  readonly errorRequests: number;
  readonly totalLatencyMs: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
  readonly endpoints: ReadonlySet<string>;
}

export interface LatencyPercentiles {
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
}

export interface ErrorRateSummary {
  readonly endpoint: string;
  readonly totalRequests: number;
  readonly errorRequests: number;
  readonly errorRate: number;
  readonly errorsByCode: Readonly<Record<string, number>>;
}

export interface TopConsumer {
  readonly consumerId: string;
  readonly apiKeyId: string;
  readonly totalRequests: number;
  readonly errorRequests: number;
  readonly errorRate: number;
  readonly avgLatencyMs: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
  readonly uniqueEndpoints: number;
}

export interface AnalyticsWindow {
  readonly windowStart: IsoTimestamp;
  readonly windowEnd: IsoTimestamp;
  readonly window: TimeWindow;
}
