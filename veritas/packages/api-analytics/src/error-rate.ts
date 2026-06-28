// Computes error rates per endpoint and overall from API call events
import { type ApiCallEvent } from "./event.js";

export interface ErrorRateStats {
  readonly endpoint: string;
  readonly totalCalls: number;
  readonly clientErrors: number;
  readonly serverErrors: number;
  readonly errorRate: number;
  readonly clientErrorRate: number;
  readonly serverErrorRate: number;
}

export interface OverallErrorRate {
  readonly totalCalls: number;
  readonly totalClientErrors: number;
  readonly totalServerErrors: number;
  readonly overallErrorRate: number;
  readonly byEndpoint: readonly ErrorRateStats[];
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function computeErrorRates(events: readonly ApiCallEvent[]): OverallErrorRate {
  const byEndpoint: Record<string, ApiCallEvent[]> = {};

  for (const ev of events) {
    const existing = byEndpoint[ev.endpoint];
    if (existing !== undefined) {
      existing.push(ev);
    } else {
      byEndpoint[ev.endpoint] = [ev];
    }
  }

  let totalClientErrors = 0;
  let totalServerErrors = 0;

  const endpointStats: ErrorRateStats[] = Object.entries(byEndpoint).map(
    ([endpoint, endpointEvents]) => {
      const clientErrors = endpointEvents.filter(
        (e) => e.statusCode >= 400 && e.statusCode < 500
      ).length;
      const serverErrors = endpointEvents.filter((e) => e.statusCode >= 500).length;
      const totalCalls = endpointEvents.length;

      totalClientErrors += clientErrors;
      totalServerErrors += serverErrors;

      return {
        endpoint,
        totalCalls,
        clientErrors,
        serverErrors,
        errorRate: rate(clientErrors + serverErrors, totalCalls),
        clientErrorRate: rate(clientErrors, totalCalls),
        serverErrorRate: rate(serverErrors, totalCalls),
      };
    }
  );

  const totalCalls = events.length;

  return {
    totalCalls,
    totalClientErrors,
    totalServerErrors,
    overallErrorRate: rate(totalClientErrors + totalServerErrors, totalCalls),
    byEndpoint: endpointStats,
  };
}
