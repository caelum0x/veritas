// Aggregation: roll up usage events into period totals per org and metric.

import { Id, IsoTimestamp, isoToEpoch, epochToIso } from "@veritas/core";
import { UsageEvent, UsageMetric } from "./event.js";
import { BillingPeriod } from "./types.js";

export type AggregationGranularity = "hour" | "day" | "month";

export interface AggregatedUsage {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly period: BillingPeriod;
  readonly totalQuantity: number;
  readonly eventCount: number;
}

function truncateToGranularity(
  ts: IsoTimestamp,
  granularity: AggregationGranularity
): Date {
  const ms = isoToEpoch(ts) ?? 0;
  const d = new Date(ms);
  if (granularity === "hour") {
    d.setUTCMinutes(0, 0, 0);
  } else if (granularity === "day") {
    d.setUTCHours(0, 0, 0, 0);
  } else {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  }
  return d;
}

function advanceByGranularity(d: Date, granularity: AggregationGranularity): Date {
  const next = new Date(d);
  if (granularity === "hour") {
    next.setUTCHours(next.getUTCHours() + 1);
  } else if (granularity === "day") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

interface Bucket {
  totalQuantity: number;
  eventCount: number;
  periodStart: IsoTimestamp;
  periodEnd: IsoTimestamp;
  organizationId: Id<string>;
  metric: UsageMetric;
}

/** Aggregate an array of usage events into per-period totals. */
export function aggregateUsageEvents(
  events: readonly UsageEvent[],
  granularity: AggregationGranularity = "month"
): AggregatedUsage[] {
  const buckets = new Map<string, Bucket>();

  for (const ev of events) {
    const periodStart = epochToIso(truncateToGranularity(ev.occurredAt as IsoTimestamp, granularity).getTime());
    const periodEnd = epochToIso(advanceByGranularity(new Date(isoToEpoch(periodStart) ?? 0), granularity).getTime());
    const key = `${ev.organizationId}::${ev.metric}::${periodStart}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.totalQuantity += ev.quantity;
      existing.eventCount += 1;
    } else {
      buckets.set(key, {
        totalQuantity: ev.quantity,
        eventCount: 1,
        periodStart,
        periodEnd,
        organizationId: ev.organizationId as unknown as Id<string>,
        metric: ev.metric,
      });
    }
  }

  return Array.from(buckets.values()).map((b) =>
    Object.freeze({
      organizationId: b.organizationId,
      metric: b.metric,
      period: Object.freeze({ start: b.periodStart, end: b.periodEnd }),
      totalQuantity: b.totalQuantity,
      eventCount: b.eventCount,
    })
  );
}

/** Filter aggregated usage to a single organization. */
export function filterAggregatedByOrg(
  aggregated: readonly AggregatedUsage[],
  organizationId: Id<string>
): AggregatedUsage[] {
  return aggregated.filter((u) => u.organizationId === organizationId);
}

/** Filter aggregated usage to entries whose period starts within [from, to). */
export function filterAggregatedByPeriod(
  aggregated: readonly AggregatedUsage[],
  from: IsoTimestamp,
  to: IsoTimestamp
): AggregatedUsage[] {
  const fromMs = isoToEpoch(from) ?? 0;
  const toMs = isoToEpoch(to) ?? Infinity;
  return aggregated.filter((u) => {
    const startMs = isoToEpoch(u.period.start);
    return startMs !== null && startMs >= fromMs && startMs < toMs;
  });
}

/** Sum the total quantity for a single metric across all aggregated records. */
export function sumByMetric(
  aggregated: readonly AggregatedUsage[],
  metric: UsageMetric
): number {
  return aggregated
    .filter((u) => u.metric === metric)
    .reduce((acc, u) => acc + u.totalQuantity, 0);
}
