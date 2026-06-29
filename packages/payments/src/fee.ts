// Platform fee calculation: tiered percentage + optional flat component on USDC amounts.

import { Usdc } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import { multiplyByRate, requireNonNegative } from "./money.js";

/** A single tier in a tiered fee schedule. */
export interface FeeTier {
  /** Upper bound (exclusive) in base units; undefined means unbounded. */
  readonly upTo?: bigint;
  /** Percentage rate, e.g. 0.025 for 2.5%. */
  readonly rate: number;
}

/** Flat fee applied unconditionally (may be ZERO). */
export interface FeeSchedule {
  /** Tiered rate schedule, ordered from smallest to largest tier. */
  readonly tiers: ReadonlyArray<FeeTier>;
  /** Flat fee added on top of the percentage component. */
  readonly flatFee: Usdc;
  /** Minimum total fee (clamps from below). */
  readonly minFee?: Usdc;
  /** Maximum total fee (caps from above). */
  readonly maxFee?: Usdc;
}

/** Breakdown of a computed fee. */
export interface FeeBreakdown {
  readonly gross: Usdc;
  readonly percentageFee: Usdc;
  readonly flatFee: Usdc;
  readonly totalFee: Usdc;
  readonly net: Usdc;
}

/** Default platform fee schedule: 2.5% + $0.30, min $0.01. */
export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  tiers: [{ rate: 0.025 }],
  flatFee: Usdc.fromDecimalString("0.300000"),
  minFee: Usdc.fromDecimalString("0.010000"),
};

/** Find the applicable tier rate for a given amount in base units. */
function findRate(tiers: ReadonlyArray<FeeTier>, baseUnits: bigint): number {
  for (const tier of tiers) {
    if (tier.upTo === undefined || baseUnits < tier.upTo) {
      return tier.rate;
    }
  }
  // Fall back to last tier if all upTo bounds are exceeded.
  const last = tiers[tiers.length - 1];
  if (last === undefined) throw new ValidationError({ message: "Fee schedule has no tiers" });
  return last.rate;
}

/**
 * Compute the platform fee for a gross USDC amount using the provided schedule.
 * Returns a FeeBreakdown with percentage, flat, and total components.
 */
export function computeFee(gross: Usdc, schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE): FeeBreakdown {
  requireNonNegative(gross, "gross");

  if (schedule.tiers.length === 0) {
    throw new ValidationError({ message: "Fee schedule must have at least one tier" });
  }

  const rate = findRate(schedule.tiers, gross.baseUnits);
  const percentageFee = multiplyByRate(gross, rate);
  const rawTotal = percentageFee.add(schedule.flatFee);

  let totalFee = rawTotal;
  if (schedule.minFee !== undefined && totalFee.compare(schedule.minFee) < 0) {
    totalFee = schedule.minFee;
  }
  if (schedule.maxFee !== undefined && totalFee.compare(schedule.maxFee) > 0) {
    totalFee = schedule.maxFee;
  }

  // Net cannot go below zero.
  const rawNet = gross.subtract(totalFee);
  const net = rawNet.compare(Usdc.ZERO) < 0 ? Usdc.ZERO : rawNet;

  return {
    gross,
    percentageFee,
    flatFee: schedule.flatFee,
    totalFee,
    net,
  };
}

/**
 * Build a simple flat-rate fee schedule with no flat component.
 * @param rate - Decimal rate, e.g. 0.03 for 3%.
 */
export function flatRateSchedule(rate: number): FeeSchedule {
  if (rate < 0 || rate > 1) {
    throw new ValidationError({ message: `Rate must be between 0 and 1, got ${rate}` });
  }
  return { tiers: [{ rate }], flatFee: Usdc.ZERO };
}
