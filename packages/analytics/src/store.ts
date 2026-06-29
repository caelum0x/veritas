// In-memory analytics event store with TTL-based eviction
import { type Result, ok, err } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";
import type { AnalyticsEvent } from "./event.js";
import type { AnalyticsQuery, AnalyticsQueryResult } from "./query.js";
import { AnalyticsStoreError } from "./errors.js";

export interface AnalyticsStoreOptions {
  readonly maxEvents: number;
  readonly ttlMs: number;
}

const DEFAULT_OPTIONS: AnalyticsStoreOptions = {
  maxEvents: 100_000,
  ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export interface AnalyticsStore {
  insert(event: AnalyticsEvent): Result<void, AnalyticsStoreError>;
  query(q: AnalyticsQuery): Result<AnalyticsQueryResult, AnalyticsStoreError>;
  evict(): number;
  size(): number;
  clear(): void;
}

export function createAnalyticsStore(
  options: Partial<AnalyticsStoreOptions> = {}
): AnalyticsStore {
  const opts: AnalyticsStoreOptions = { ...DEFAULT_OPTIONS, ...options };
  let events: AnalyticsEvent[] = [];

  function insert(event: AnalyticsEvent): Result<void, AnalyticsStoreError> {
    if (events.length >= opts.maxEvents) {
      return err(
        new AnalyticsStoreError("Store capacity exceeded", { maxEvents: opts.maxEvents })
      );
    }
    events = [...events, event];
    return ok(undefined);
  }

  function query(q: AnalyticsQuery): Result<AnalyticsQueryResult, AnalyticsStoreError> {
    const fromMs = q.from ? new Date(q.from).getTime() : 0;
    const toMs = q.to ? new Date(q.to).getTime() : Date.now();

    let filtered = events.filter((e) => {
      const ts = new Date(e.occurredAt).getTime();
      if (ts < fromMs || ts > toMs) return false;
      if (q.organizationId && e.organizationId !== q.organizationId) return false;
      if (q.eventNames && !q.eventNames.includes(e.type)) return false;
      if (q.userId && e.userId !== q.userId) return false;
      return true;
    });

    const total = filtered.length;
    const limit = q.limit ?? 100;
    const offset = q.offset ?? 0;
    filtered = filtered.slice(offset, offset + limit);

    return ok({ events: filtered, total, limit, offset });
  }

  function evict(): number {
    const cutoff = Date.now() - opts.ttlMs;
    const before = events.length;
    events = events.filter((e) => new Date(e.occurredAt).getTime() >= cutoff);
    return before - events.length;
  }

  function size(): number {
    return events.length;
  }

  function clear(): void {
    events = [];
  }

  return { insert, query, evict, size, clear };
}
