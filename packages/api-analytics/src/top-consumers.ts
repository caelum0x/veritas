// Computes top API consumers ranked by request count from a set of ApiCallEvents
import { type ApiCallEvent } from "./event.js";
import { type ConsumerStats, type TopConsumer } from "./types.js";

function buildConsumerStats(events: readonly ApiCallEvent[]): Map<string, ConsumerStats> {
  const statsMap = new Map<string, ConsumerStats>();

  for (const event of events) {
    const existing = statsMap.get(event.consumerId);
    const endpoints = existing ? new Set(existing.endpoints) : new Set<string>();
    endpoints.add(`${event.method}:${event.endpoint}`);

    const updated: ConsumerStats = {
      consumerId: event.consumerId,
      apiKeyId: event.apiKeyId,
      totalRequests: (existing?.totalRequests ?? 0) + 1,
      errorRequests: (existing?.errorRequests ?? 0) + (event.statusCode >= 400 ? 1 : 0),
      totalLatencyMs: (existing?.totalLatencyMs ?? 0) + event.latencyMs,
      totalRequestBytes: (existing?.totalRequestBytes ?? 0) + event.requestSizeBytes,
      totalResponseBytes: (existing?.totalResponseBytes ?? 0) + event.responseSizeBytes,
      endpoints,
    };

    statsMap.set(event.consumerId, updated);
  }

  return statsMap;
}

function toTopConsumer(stats: ConsumerStats): TopConsumer {
  const errorRate = stats.totalRequests > 0 ? stats.errorRequests / stats.totalRequests : 0;
  const avgLatencyMs = stats.totalRequests > 0 ? stats.totalLatencyMs / stats.totalRequests : 0;

  return {
    consumerId: stats.consumerId,
    apiKeyId: stats.apiKeyId,
    totalRequests: stats.totalRequests,
    errorRequests: stats.errorRequests,
    errorRate,
    avgLatencyMs,
    totalRequestBytes: stats.totalRequestBytes,
    totalResponseBytes: stats.totalResponseBytes,
    uniqueEndpoints: stats.endpoints.size,
  };
}

export type TopConsumerSortKey = "requests" | "errors" | "errorRate" | "latency" | "bytes";

export interface TopConsumersOptions {
  readonly limit?: number;
  readonly sortBy?: TopConsumerSortKey;
}

export function computeTopConsumers(
  events: readonly ApiCallEvent[],
  options: TopConsumersOptions = {}
): readonly TopConsumer[] {
  const { limit = 10, sortBy = "requests" } = options;
  const statsMap = buildConsumerStats(events);

  const consumers = Array.from(statsMap.values()).map(toTopConsumer);

  const sortFns: Readonly<Record<TopConsumerSortKey, (a: TopConsumer, b: TopConsumer) => number>> = {
    requests: (a, b) => b.totalRequests - a.totalRequests,
    errors: (a, b) => b.errorRequests - a.errorRequests,
    errorRate: (a, b) => b.errorRate - a.errorRate,
    latency: (a, b) => b.avgLatencyMs - a.avgLatencyMs,
    bytes: (a, b) => (b.totalRequestBytes + b.totalResponseBytes) - (a.totalRequestBytes + a.totalResponseBytes),
  };

  return [...consumers].sort(sortFns[sortBy]).slice(0, limit);
}
