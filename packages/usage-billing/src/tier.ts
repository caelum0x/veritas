// Tiered pricing: compute charges using graduated/tiered pricing bands.

import { UsageMetric } from "./event.js";

/** A single pricing band in a tiered/graduated pricing schedule. */
export interface PricingBand {
  /** Inclusive lower bound (units). */
  readonly from: number;
  /** Exclusive upper bound; null means unbounded. */
  readonly to: number | null;
  /** Price per unit in USDC micro-units (6 decimals) within this band. */
  readonly unitPrice: bigint;
}

/** A graduated pricing schedule for a single metric. */
export interface TieredPricingSchedule {
  readonly metric: UsageMetric;
  readonly bands: readonly PricingBand[];
}

/** Result of applying a tiered schedule to a quantity. */
export interface TieredChargeResult {
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly totalCharge: bigint;
  readonly bandBreakdown: readonly BandCharge[];
}

export interface BandCharge {
  readonly from: number;
  readonly to: number | null;
  readonly unitsInBand: number;
  readonly unitPrice: bigint;
  readonly charge: bigint;
}

/**
 * Compute a graduated charge: each unit is priced according to the band it
 * falls into. Units are consumed sequentially across bands.
 */
export function computeTieredCharge(
  schedule: TieredPricingSchedule,
  quantity: number
): TieredChargeResult {
  if (quantity < 0) {
    throw new RangeError(`Quantity must be non-negative, got ${quantity}`);
  }

  let remaining = quantity;
  let totalCharge = 0n;
  const breakdown: BandCharge[] = [];

  for (const band of schedule.bands) {
    if (remaining <= 0) break;

    const bandCapacity = band.to !== null ? band.to - band.from : Infinity;
    const unitsInBand = Math.min(remaining, bandCapacity);
    const charge = BigInt(Math.ceil(unitsInBand)) * band.unitPrice;

    breakdown.push(
      Object.freeze({
        from: band.from,
        to: band.to,
        unitsInBand,
        unitPrice: band.unitPrice,
        charge,
      })
    );

    totalCharge += charge;
    remaining -= unitsInBand;
  }

  return Object.freeze({
    metric: schedule.metric,
    quantity,
    totalCharge,
    bandBreakdown: Object.freeze(breakdown),
  });
}

/** Build a simple flat-rate schedule (single band) from a unit price. */
export function flatRateSchedule(
  metric: UsageMetric,
  unitPrice: bigint
): TieredPricingSchedule {
  return Object.freeze({
    metric,
    bands: Object.freeze([Object.freeze({ from: 0, to: null, unitPrice })]),
  });
}

/** Validate that bands are contiguous, non-overlapping, and sorted. */
export function validateBands(bands: readonly PricingBand[]): string | null {
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (band === undefined) continue;
    if (band.to !== null && band.to <= band.from) {
      return `Band ${i} has to (${band.to}) <= from (${band.from})`;
    }
    if (i > 0) {
      const prev = bands[i - 1];
      if (prev !== undefined && prev.to !== band.from) {
        return `Gap or overlap between band ${i - 1} (to=${prev.to}) and band ${i} (from=${band.from})`;
      }
    }
  }
  return null;
}
