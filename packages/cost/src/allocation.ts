// Cost allocation: tracks and aggregates costs by tenant and feature dimensions
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import type { CostEvent } from "./cost-event.js";

export const AllocationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  featureId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalAmountUsdc: z.number().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  breakdown: z.record(z.string(), z.number().nonnegative()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Allocation = z.infer<typeof AllocationSchema>;

export interface AllocationKey {
  readonly tenantId: string;
  readonly featureId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

function allocationMapKey(key: AllocationKey): string {
  return `${key.tenantId}::${key.featureId}::${key.periodStart}::${key.periodEnd}`;
}

export interface AllocationRepository {
  upsert(key: AllocationKey, events: ReadonlyArray<CostEvent>): Promise<Allocation>;
  findByTenant(tenantId: string, periodStart: string, periodEnd: string): Promise<ReadonlyArray<Allocation>>;
  findByFeature(featureId: string, periodStart: string, periodEnd: string): Promise<ReadonlyArray<Allocation>>;
}

export class InMemoryAllocationRepository implements AllocationRepository {
  private readonly store = new Map<string, Allocation>();

  async upsert(key: AllocationKey, events: ReadonlyArray<CostEvent>): Promise<Allocation> {
    const mapKey = allocationMapKey(key);
    const existing = this.store.get(mapKey);
    const now = epochToIso(Date.now());

    const breakdown = events.reduce<Record<string, number>>((acc, e) => {
      const prev = acc[e.kind] ?? 0;
      return { ...acc, [e.kind]: prev + e.amountUsdc };
    }, existing ? { ...existing.breakdown } : {});

    const totalAmountUsdc = Object.values(breakdown).reduce((s, v) => s + v, 0);
    const eventCount = (existing?.eventCount ?? 0) + events.length;

    const allocation: Allocation = AllocationSchema.parse({
      id: existing?.id ?? newId("alloc"),
      tenantId: key.tenantId,
      featureId: key.featureId,
      periodStart: key.periodStart,
      periodEnd: key.periodEnd,
      totalAmountUsdc,
      eventCount,
      breakdown,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    this.store.set(mapKey, allocation);
    return allocation;
  }

  async findByTenant(tenantId: string, periodStart: string, periodEnd: string): Promise<ReadonlyArray<Allocation>> {
    return Array.from(this.store.values()).filter(
      (a) => a.tenantId === tenantId && a.periodStart === periodStart && a.periodEnd === periodEnd,
    );
  }

  async findByFeature(featureId: string, periodStart: string, periodEnd: string): Promise<ReadonlyArray<Allocation>> {
    return Array.from(this.store.values()).filter(
      (a) => a.featureId === featureId && a.periodStart === periodStart && a.periodEnd === periodEnd,
    );
  }
}
