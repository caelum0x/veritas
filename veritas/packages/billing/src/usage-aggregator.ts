// UsageAggregator: aggregate metering events into per-period usage totals per org.

import { Id, IsoTimestamp, isoToEpoch, epochToIso } from "@veritas/core";
import { UsageMetricSchema } from "@veritas/contracts";
import { z } from "zod";
import { type MeteringEvent } from "./metering.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface PeriodUsage {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly totalQuantity: number;
  readonly eventCount: number;
}

export type AggregationGranularity = "day" | "month";

function truncateToPeriodStart(
  ts: IsoTimestamp,
  granularity: AggregationGranularity
): IsoTimestamp {
  const d = new Date(isoToEpoch(ts) ?? 0);
  if (granularity === "day") {
    d.setUTCHours(0, 0, 0, 0);
  } else {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  }
  return epochToIso(d.getTime());
}

function periodEnd(
  start: IsoTimestamp,
  granularity: AggregationGranularity
): IsoTimestamp {
  const d = new Date(isoToEpoch(start) ?? 0);
  if (granularity === "day") {
    d.setUTCDate(d.getUTCDate() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return epochToIso(d.getTime());
}

export function aggregateUsage(
  events: readonly MeteringEvent[],
  granularity: AggregationGranularity = "month"
): PeriodUsage[] {
  // key = `${orgId}::${metric}::${periodStart}`
  const buckets = new Map<
    string,
    { totalQuantity: number; eventCount: number; periodStart: IsoTimestamp; periodEnd: IsoTimestamp; organizationId: Id<string>; metric: UsageMetric }
  >();

  for (const ev of events) {
    const pStart = truncateToPeriodStart(ev.occurredAt, granularity);
    const pEnd = periodEnd(pStart, granularity);
    const key = `${ev.organizationId}::${ev.metric}::${pStart}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.totalQuantity += ev.quantity;
      existing.eventCount += 1;
    } else {
      buckets.set(key, {
        totalQuantity: ev.quantity,
        eventCount: 1,
        periodStart: pStart,
        periodEnd: pEnd,
        organizationId: ev.organizationId,
        metric: ev.metric,
      });
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    organizationId: b.organizationId,
    metric: b.metric,
    periodStart: b.periodStart,
    periodEnd: b.periodEnd,
    totalQuantity: b.totalQuantity,
    eventCount: b.eventCount,
  }));
}

export function filterByOrg(
  aggregated: readonly PeriodUsage[],
  organizationId: Id<string>
): PeriodUsage[] {
  return aggregated.filter((u) => u.organizationId === organizationId);
}

export function filterByPeriod(
  aggregated: readonly PeriodUsage[],
  from: IsoTimestamp,
  to: IsoTimestamp
): PeriodUsage[] {
  const fromMs = isoToEpoch(from) ?? 0;
  const toMs = isoToEpoch(to) ?? Infinity;
  return aggregated.filter((u) => {
    const periodStartMs = isoToEpoch(u.periodStart);
    return periodStartMs !== null && periodStartMs >= fromMs && periodStartMs < toMs;
  });
}
