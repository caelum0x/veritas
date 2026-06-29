// Windowed aggregation: count, sum, min, max, avg over StreamEvent payloads.
import type { StreamEvent, AggregateKind, WindowResult } from "./types.js";

export type AggregateResult = {
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly kind: AggregateKind;
  readonly key: string | undefined;
  readonly value: number;
  readonly count: number;
};

export type ExtractorFn<T> = (payload: T) => number;

function aggregate<T>(
  events: ReadonlyArray<StreamEvent<T>>,
  kind: AggregateKind,
  extractor: ExtractorFn<T>,
): { value: number; count: number } {
  if (events.length === 0) return { value: 0, count: 0 };
  const nums = events.map((e) => extractor(e.payload));
  const count = nums.length;
  switch (kind) {
    case "count": return { value: count, count };
    case "sum": return { value: nums.reduce((a, b) => a + b, 0), count };
    case "min": return { value: Math.min(...nums), count };
    case "max": return { value: Math.max(...nums), count };
    case "avg": return { value: nums.reduce((a, b) => a + b, 0) / count, count };
  }
}

export function aggregateWindow<T>(
  window: WindowResult<T>,
  kind: AggregateKind,
  extractor: ExtractorFn<T>,
  groupByKey = false,
): ReadonlyArray<AggregateResult> {
  if (groupByKey) {
    const groups = new Map<string | undefined, Array<StreamEvent<T>>>();
    for (const event of window.events) {
      const k = event.key;
      const group = groups.get(k) ?? [];
      groups.set(k, [...group, event]);
    }
    const results: Array<AggregateResult> = [];
    for (const [key, events] of groups) {
      const { value, count } = aggregate(events, kind, extractor);
      results.push({ windowStart: window.windowStart, windowEnd: window.windowEnd, kind, key, value, count });
    }
    return results;
  }
  const { value, count } = aggregate(window.events, kind, extractor);
  return [{ windowStart: window.windowStart, windowEnd: window.windowEnd, kind, key: undefined, value, count }];
}

export function aggregateWindows<T>(
  windows: ReadonlyArray<WindowResult<T>>,
  kind: AggregateKind,
  extractor: ExtractorFn<T>,
  groupByKey = false,
): ReadonlyArray<AggregateResult> {
  return windows.flatMap((w) => aggregateWindow(w, kind, extractor, groupByKey));
}
