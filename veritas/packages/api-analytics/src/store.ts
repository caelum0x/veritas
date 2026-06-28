// In-memory analytics store: holds ApiCallEvents and provides retrieval by time window
import { type IsoTimestamp, epochToIso, isoToEpoch } from "@veritas/core";
import { type ApiCallEvent } from "./event.js";
import { type TimeWindow } from "./types.js";

const WINDOW_MS: Readonly<Record<TimeWindow, number>> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
  "7d": 604_800_000,
  "30d": 2_592_000_000,
};

export interface AnalyticsStore {
  record(event: ApiCallEvent): void;
  query(window: TimeWindow, now?: IsoTimestamp): readonly ApiCallEvent[];
  queryRange(from: IsoTimestamp, to: IsoTimestamp): readonly ApiCallEvent[];
  size(): number;
  prune(before: IsoTimestamp): number;
}

export function createAnalyticsStore(maxEvents = 500_000): AnalyticsStore {
  const events: ApiCallEvent[] = [];

  function record(event: ApiCallEvent): void {
    if (events.length >= maxEvents) {
      events.shift();
    }
    events.push(event);
  }

  function query(window: TimeWindow, now?: IsoTimestamp): readonly ApiCallEvent[] {
    const nowMs = now ? (isoToEpoch(now) ?? Date.now()) : Date.now();
    const fromMs = nowMs - WINDOW_MS[window];
    return events.filter((e) => {
      const ts = isoToEpoch(e.timestamp);
      return ts !== null && ts >= fromMs && ts <= nowMs;
    });
  }

  function queryRange(from: IsoTimestamp, to: IsoTimestamp): readonly ApiCallEvent[] {
    const fromMs = isoToEpoch(from);
    const toMs = isoToEpoch(to);
    if (fromMs === null || toMs === null) return [];
    return events.filter((e) => {
      const ts = isoToEpoch(e.timestamp);
      return ts !== null && ts >= fromMs && ts <= toMs;
    });
  }

  function size(): number {
    return events.length;
  }

  function prune(before: IsoTimestamp): number {
    const beforeMs = isoToEpoch(before);
    if (beforeMs === null) return 0;
    let removed = 0;
    let i = 0;
    while (i < events.length) {
      const ts = isoToEpoch(events[i]!.timestamp);
      if (ts !== null && ts < beforeMs) {
        events.splice(i, 1);
        removed++;
      } else {
        i++;
      }
    }
    return removed;
  }

  return { record, query, queryRange, size, prune };
}

export { WINDOW_MS };
export type { TimeWindow };
