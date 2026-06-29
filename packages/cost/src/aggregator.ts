// Cost aggregator: rolls up cost events into per-tenant/feature/period summaries
import type { IsoTimestamp } from "@veritas/core";
import type { CostEvent } from "./cost-event.js";
import type { Allocation } from "./allocation.js";

export interface CostSummary {
  readonly tenantId: string;
  readonly feature: string | undefined;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly totalUsdc: number;
  readonly eventCount: number;
  readonly breakdown: Record<string, number>;
}

export interface AggregationWindow {
  readonly start: IsoTimestamp;
  readonly end: IsoTimestamp;
}

function makeKey(tenantId: string, feature: string | undefined): string {
  return feature ? `${tenantId}::${feature}` : tenantId;
}

interface GroupAccum {
  readonly tenantId: string;
  readonly feature: string | undefined;
  readonly total: number;
  readonly count: number;
  readonly breakdown: Record<string, number>;
}

export interface CostAggregator {
  aggregate(events: readonly CostEvent[], window: AggregationWindow): CostSummary[];
  aggregateAllocations(
    allocations: readonly Allocation[],
    window: AggregationWindow
  ): CostSummary[];
}

export function createCostAggregator(): CostAggregator {
  function aggregate(
    events: readonly CostEvent[],
    window: AggregationWindow
  ): CostSummary[] {
    const windowStart = new Date(window.start).getTime();
    const windowEnd = new Date(window.end).getTime();

    const inWindow = events.filter((e) => {
      const t = new Date(e.occurredAt).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    const groups = new Map<string, GroupAccum>();

    for (const event of inWindow) {
      const key = makeKey(event.tenantId, event.featureId);
      const existing: GroupAccum = groups.get(key) ?? {
        tenantId: event.tenantId,
        feature: event.featureId,
        total: 0,
        count: 0,
        breakdown: {},
      };
      const kindKey: string = event.kind;
      const prevKind: number = (existing.breakdown as Record<string, number>)[kindKey] ?? 0;
      const next: GroupAccum = {
        ...existing,
        total: existing.total + event.amountUsdc,
        count: existing.count + 1,
        breakdown: {
          ...existing.breakdown,
          [kindKey]: prevKind + event.amountUsdc,
        },
      };
      groups.set(key, next);
    }

    return Array.from(groups.values()).map((g) => ({
      tenantId: g.tenantId,
      feature: g.feature,
      periodStart: window.start,
      periodEnd: window.end,
      totalUsdc: g.total,
      eventCount: g.count,
      breakdown: g.breakdown,
    }));
  }

  function aggregateAllocations(
    allocations: readonly Allocation[],
    window: AggregationWindow
  ): CostSummary[] {
    const windowStart = new Date(window.start).getTime();
    const windowEnd = new Date(window.end).getTime();

    const inWindow = allocations.filter((a) => {
      const t = new Date(a.periodStart).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    const groups = new Map<string, GroupAccum>();

    for (const alloc of inWindow) {
      const key = makeKey(alloc.tenantId, alloc.featureId);
      const existing: GroupAccum = groups.get(key) ?? {
        tenantId: alloc.tenantId,
        feature: alloc.featureId,
        total: 0,
        count: 0,
        breakdown: {},
      };
      const categoryKey: string = alloc.featureId;
      const prevCategory: number = (existing.breakdown as Record<string, number>)[categoryKey] ?? 0;
      const next: GroupAccum = {
        ...existing,
        total: existing.total + alloc.totalAmountUsdc,
        count: existing.count + 1,
        breakdown: {
          ...existing.breakdown,
          [categoryKey]: prevCategory + alloc.totalAmountUsdc,
        },
      };
      groups.set(key, next);
    }

    return Array.from(groups.values()).map((g) => ({
      tenantId: g.tenantId,
      feature: g.feature,
      periodStart: window.start,
      periodEnd: window.end,
      totalUsdc: g.total,
      eventCount: g.count,
      breakdown: g.breakdown,
    }));
  }

  return { aggregate, aggregateAllocations };
}
