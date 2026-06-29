// Mapper between Plan domain objects and raw persistence rows.

import type { Plan, CreatePlan, UpdatePlan } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch, systemClock } from "@veritas/core";

/** Persistence row shape for a Plan. */
export type PlanRow = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly priceAmount: string;
  readonly priceCurrency: "USDC";
  readonly interval: "MONTHLY" | "YEARLY";
  readonly includedVerifications: number;
  readonly overagePriceAmount: string | null;
  readonly overagePriceCurrency: "USDC" | null;
  readonly active: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
};

/** Map a CreatePlan DTO to a new PlanRow with generated id and timestamps. */
export function toPlanRow(dto: CreatePlan): PlanRow {
  const now = Date.now();
  return {
    id: newId("plan"),
    slug: dto.slug,
    name: dto.name,
    priceAmount: dto.price.amount,
    priceCurrency: dto.price.currency,
    interval: dto.interval,
    includedVerifications: dto.includedVerifications,
    overagePriceAmount: dto.overagePrice?.amount ?? null,
    overagePriceCurrency: dto.overagePrice?.currency ?? null,
    active: dto.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a persisted PlanRow to a Plan domain object. */
export function fromPlanRow(row: PlanRow): Plan {
  return {
    id: row.id as Plan["id"],
    slug: row.slug,
    name: row.name,
    price: { amount: row.priceAmount, currency: row.priceCurrency },
    interval: row.interval,
    includedVerifications: row.includedVerifications,
    overagePrice:
      row.overagePriceAmount !== null && row.overagePriceCurrency !== null
        ? { amount: row.overagePriceAmount, currency: row.overagePriceCurrency }
        : null,
    active: row.active,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Merge an UpdatePlan DTO into an existing PlanRow, returning a new row. */
export function mergePlanRow(existing: PlanRow, dto: UpdatePlan): PlanRow {
  const newPrice = dto.price ?? { amount: existing.priceAmount, currency: existing.priceCurrency };
  const hasOverage = dto.overagePrice !== undefined;
  const newOverage = hasOverage ? (dto.overagePrice ?? null) : null;
  const existingOverage =
    existing.overagePriceAmount !== null && existing.overagePriceCurrency !== null
      ? { amount: existing.overagePriceAmount, currency: existing.overagePriceCurrency }
      : null;
  const resolvedOverage = hasOverage ? newOverage : existingOverage;

  return {
    ...existing,
    slug: dto.slug ?? existing.slug,
    name: dto.name ?? existing.name,
    priceAmount: newPrice.amount,
    priceCurrency: newPrice.currency,
    interval: dto.interval ?? existing.interval,
    includedVerifications: dto.includedVerifications ?? existing.includedVerifications,
    overagePriceAmount: resolvedOverage?.amount ?? null,
    overagePriceCurrency: resolvedOverage?.currency ?? null,
    active: dto.active !== undefined ? dto.active : existing.active,
    updatedAt: Date.now(),
  };
}

/** Map a Plan domain object back to a persistence row. */
export function fromPlanDomain(plan: Plan): PlanRow {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    priceAmount: plan.price.amount,
    priceCurrency: plan.price.currency,
    interval: plan.interval,
    includedVerifications: plan.includedVerifications,
    overagePriceAmount: plan.overagePrice?.amount ?? null,
    overagePriceCurrency: plan.overagePrice?.currency ?? null,
    active: plan.active,
    createdAt: isoToEpoch(plan.createdAt) ?? Date.now(),
    updatedAt: isoToEpoch(plan.updatedAt) ?? Date.now(),
  };
}

/** Get a current epoch timestamp from the system clock. */
export function nowEpoch(): number {
  return systemClock.now();
}
