// Time-bucket aggregation of raw analytics events into counts and sums
import { IsoTimestamp } from "@veritas/core";
import { AnalyticsEvent, AnalyticsEventType } from "./event.js";

export type BucketGranularity = "hour" | "day" | "week" | "month";

export interface TimeBucket {
  bucketKey: string;
  granularity: BucketGranularity;
  eventType: AnalyticsEventType;
  count: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  organizationId: string | undefined;
}

function toBucketKey(ts: IsoTimestamp, granularity: BucketGranularity): string {
  const d = new Date(ts);
  switch (granularity) {
    case "hour":
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}`;
    case "day":
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    case "week": {
      const dayOfWeek = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7));
      return `${monday.getUTCFullYear()}-W${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
    }
    case "month":
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export interface AggregationOptions {
  granularity: BucketGranularity;
  filterOrganizationId?: string;
}

export function aggregateEvents(
  events: readonly AnalyticsEvent[],
  opts: AggregationOptions
): TimeBucket[] {
  const { granularity, filterOrganizationId } = opts;
  const map = new Map<string, TimeBucket>();

  for (const ev of events) {
    if (filterOrganizationId !== undefined && ev.organizationId !== filterOrganizationId) {
      continue;
    }
    const key = `${toBucketKey(ev.occurredAt, granularity)}::${ev.type}::${ev.organizationId ?? ""}`;
    const existing = map.get(key);
    const dur = ev.durationMs ?? 0;

    if (existing === undefined) {
      map.set(key, {
        bucketKey: toBucketKey(ev.occurredAt, granularity),
        granularity,
        eventType: ev.type,
        count: 1,
        successCount: ev.success === true ? 1 : 0,
        failureCount: ev.success === false ? 1 : 0,
        totalDurationMs: dur,
        avgDurationMs: dur,
        organizationId: ev.organizationId,
      });
    } else {
      const count = existing.count + 1;
      const totalDurationMs = existing.totalDurationMs + dur;
      map.set(key, {
        ...existing,
        count,
        successCount: existing.successCount + (ev.success === true ? 1 : 0),
        failureCount: existing.failureCount + (ev.success === false ? 1 : 0),
        totalDurationMs,
        avgDurationMs: totalDurationMs / count,
      });
    }
  }

  return Array.from(map.values());
}
