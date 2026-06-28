// Daily and monthly rollup computation from raw event streams
import { IsoTimestamp, epochToIso } from "@veritas/core";
import { AnalyticsEvent } from "./event.js";
import { aggregateEvents, TimeBucket } from "./aggregator.js";

export interface DailyRollup {
  date: string;
  organizationId: string | undefined;
  eventCounts: Record<string, number>;
  successCounts: Record<string, number>;
  totalEvents: number;
  totalSuccesses: number;
  totalFailures: number;
  avgDurationMs: number;
  computedAt: IsoTimestamp;
}

export interface MonthlyRollup {
  yearMonth: string;
  organizationId: string | undefined;
  dailyRollups: readonly DailyRollup[];
  totalEvents: number;
  totalSuccesses: number;
  totalFailures: number;
  avgDurationMs: number;
  computedAt: IsoTimestamp;
}

function buildDailyRollup(
  date: string,
  organizationId: string | undefined,
  buckets: readonly TimeBucket[]
): DailyRollup {
  const relevant = buckets.filter(
    (b) =>
      b.bucketKey === date &&
      (organizationId === undefined || b.organizationId === organizationId)
  );

  const eventCounts: Record<string, number> = {};
  const successCounts: Record<string, number> = {};
  let totalEvents = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;
  let weightedDuration = 0;

  for (const b of relevant) {
    eventCounts[b.eventType] = (eventCounts[b.eventType] ?? 0) + b.count;
    successCounts[b.eventType] = (successCounts[b.eventType] ?? 0) + b.successCount;
    totalEvents += b.count;
    totalSuccesses += b.successCount;
    totalFailures += b.failureCount;
    weightedDuration += b.totalDurationMs;
  }

  const avgDurationMs = totalEvents > 0 ? weightedDuration / totalEvents : 0;

  return {
    date,
    organizationId,
    eventCounts,
    successCounts,
    totalEvents,
    totalSuccesses,
    totalFailures,
    avgDurationMs,
    computedAt: epochToIso(Date.now()),
  };
}

export function buildDailyRollups(
  events: readonly AnalyticsEvent[],
  organizationId?: string
): DailyRollup[] {
  const buckets = aggregateEvents(events, {
    granularity: "day",
    filterOrganizationId: organizationId,
  });

  const dates = [...new Set(buckets.map((b) => b.bucketKey))].sort();
  const orgIds =
    organizationId !== undefined
      ? [organizationId]
      : [...new Set(buckets.map((b) => b.organizationId))];

  const rollups: DailyRollup[] = [];
  for (const date of dates) {
    for (const org of orgIds) {
      rollups.push(buildDailyRollup(date, org, buckets));
    }
  }
  return rollups;
}

export function buildMonthlyRollup(
  yearMonth: string,
  dailyRollups: readonly DailyRollup[],
  organizationId?: string
): MonthlyRollup {
  const relevant = dailyRollups.filter(
    (r) =>
      r.date.startsWith(yearMonth) &&
      (organizationId === undefined || r.organizationId === organizationId)
  );

  const totalEvents = relevant.reduce((s, r) => s + r.totalEvents, 0);
  const totalSuccesses = relevant.reduce((s, r) => s + r.totalSuccesses, 0);
  const totalFailures = relevant.reduce((s, r) => s + r.totalFailures, 0);
  const weightedDuration = relevant.reduce((s, r) => s + r.avgDurationMs * r.totalEvents, 0);
  const avgDurationMs = totalEvents > 0 ? weightedDuration / totalEvents : 0;

  return {
    yearMonth,
    organizationId,
    dailyRollups: relevant,
    totalEvents,
    totalSuccesses,
    totalFailures,
    avgDurationMs,
    computedAt: epochToIso(Date.now()),
  };
}

export function buildMonthlyRollups(
  events: readonly AnalyticsEvent[],
  organizationId?: string
): MonthlyRollup[] {
  const dailyRollups = buildDailyRollups(events, organizationId);
  const yearMonths = [...new Set(dailyRollups.map((r) => r.date.slice(0, 7)))].sort();

  return yearMonths.map((ym) => buildMonthlyRollup(ym, dailyRollups, organizationId));
}
