// Computes latency percentiles (p50, p90, p95, p99) from a set of API call events
import { type ApiCallEvent } from "./event.js";

export interface LatencyPercentiles {
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly count: number;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0;
}

export function computeLatencyPercentiles(events: readonly ApiCallEvent[]): LatencyPercentiles {
  if (events.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0, count: 0 };
  }

  const sorted = [...events.map((e) => e.latencyMs)].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);

  return {
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: total / sorted.length,
    count: sorted.length,
  };
}

export function computeLatencyByEndpoint(
  events: readonly ApiCallEvent[]
): Readonly<Record<string, LatencyPercentiles>> {
  const byEndpoint: Record<string, ApiCallEvent[]> = {};

  for (const ev of events) {
    const existing = byEndpoint[ev.endpoint];
    if (existing !== undefined) {
      existing.push(ev);
    } else {
      byEndpoint[ev.endpoint] = [ev];
    }
  }

  const result: Record<string, LatencyPercentiles> = {};
  for (const [endpoint, endpointEvents] of Object.entries(byEndpoint)) {
    result[endpoint] = computeLatencyPercentiles(endpointEvents);
  }
  return result;
}
