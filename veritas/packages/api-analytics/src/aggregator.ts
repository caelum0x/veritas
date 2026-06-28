// Aggregates API call events by endpoint, computing counts and totals
import { groupBy } from "@veritas/core";
import { type ApiCallEvent } from "./event.js";

export interface EndpointStats {
  readonly endpoint: string;
  readonly totalCalls: number;
  readonly totalLatencyMs: number;
  readonly totalErrors: number;
  readonly totalRequestBytes: number;
  readonly totalResponseBytes: number;
  readonly statusCodeCounts: Readonly<Record<string, number>>;
}

export interface AggregationResult {
  readonly byEndpoint: readonly EndpointStats[];
  readonly totalCalls: number;
  readonly windowStart: number;
  readonly windowEnd: number;
}

export function aggregateByEndpoint(
  events: readonly ApiCallEvent[],
  windowStart: number,
  windowEnd: number
): AggregationResult {
  const grouped = groupBy(events, (e) => e.endpoint);

  const byEndpoint: EndpointStats[] = Object.entries(grouped).map(([endpoint, endpointEvents]) => {
    const statusCodeCounts: Record<string, number> = {};
    let totalLatencyMs = 0;
    let totalErrors = 0;
    let totalRequestBytes = 0;
    let totalResponseBytes = 0;

    for (const ev of endpointEvents) {
      totalLatencyMs += ev.latencyMs;
      totalRequestBytes += ev.requestSizeBytes;
      totalResponseBytes += ev.responseSizeBytes;

      const code = String(ev.statusCode);
      statusCodeCounts[code] = (statusCodeCounts[code] ?? 0) + 1;

      if (ev.statusCode >= 400) {
        totalErrors += 1;
      }
    }

    return {
      endpoint,
      totalCalls: endpointEvents.length,
      totalLatencyMs,
      totalErrors,
      totalRequestBytes,
      totalResponseBytes,
      statusCodeCounts,
    };
  });

  return {
    byEndpoint,
    totalCalls: events.length,
    windowStart,
    windowEnd,
  };
}
