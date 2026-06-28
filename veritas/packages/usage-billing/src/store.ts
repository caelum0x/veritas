// store.ts: in-memory meter store for accumulating usage totals per org and window.

import { Id, IsoTimestamp, epochToIso, isoToEpoch } from "@veritas/core";
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { type BillingWindow, isInWindow } from "./window.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface MeterEntry {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly recordedAt: IsoTimestamp;
}

export interface MeterSnapshot {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly total: number;
  readonly entryCount: number;
}

export class MeterStore {
  private readonly entries: MeterEntry[] = [];

  record(
    organizationId: Id<string>,
    metric: UsageMetric,
    quantity: number,
    recordedAt?: IsoTimestamp
  ): void {
    if (quantity < 0) throw new Error(`Quantity must be non-negative, got ${quantity}`);
    this.entries.push({
      organizationId,
      metric,
      quantity,
      recordedAt: recordedAt ?? epochToIso(Date.now()),
    });
  }

  snapshot(
    organizationId: Id<string>,
    window: BillingWindow
  ): readonly MeterSnapshot[] {
    const relevant = this.entries.filter(
      (e) => e.organizationId === organizationId && isInWindow(window, e.recordedAt)
    );

    const buckets = new Map<UsageMetric, { total: number; count: number }>();
    for (const entry of relevant) {
      const existing = buckets.get(entry.metric);
      if (existing) {
        existing.total += entry.quantity;
        existing.count += 1;
      } else {
        buckets.set(entry.metric, { total: entry.quantity, count: 1 });
      }
    }

    return Array.from(buckets.entries()).map(([metric, { total, count }]) => ({
      organizationId,
      metric,
      total,
      entryCount: count,
    }));
  }

  totalsMap(
    organizationId: Id<string>,
    window: BillingWindow
  ): ReadonlyMap<UsageMetric, number> {
    const snaps = this.snapshot(organizationId, window);
    return new Map(snaps.map((s) => [s.metric, s.total]));
  }

  allEntries(): readonly MeterEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  purgeOlderThan(before: IsoTimestamp): number {
    const beforeMs = isoToEpoch(before) ?? 0;
    const initial = this.entries.length;
    const kept = this.entries.filter((e) => {
      const ms = isoToEpoch(e.recordedAt);
      return ms !== null && ms >= beforeMs;
    });
    this.entries.length = 0;
    this.entries.push(...kept);
    return initial - this.entries.length;
  }
}
