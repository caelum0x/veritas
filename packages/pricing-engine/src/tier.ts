// Usage tier definitions for tiered pricing structures.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import { type PriceMoney, priceMoney, type Currency } from "./types.js";

export const TierSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  minUnits: z.number().int().nonnegative(),
  maxUnits: z.number().int().positive().optional(),
  /** Unit price in USDC base units (bigint string). */
  unitPriceBaseUnits: z.string(),
  /** Optional flat fee in USDC base units (bigint string). */
  flatFeeBaseUnits: z.string().optional(),
});

export type Tier = z.infer<typeof TierSchema>;

export const TierListSchema = z.array(TierSchema);
export type TierList = z.infer<typeof TierListSchema>;

/** Find the applicable tier for a given unit count (volume/flat-rate: single tier for all). */
export function findTier(tiers: TierList, units: number): Tier | undefined {
  const sorted = [...tiers].sort((a, b) => a.minUnits - b.minUnits);
  let matched: Tier | undefined;
  for (const tier of sorted) {
    if (units >= tier.minUnits) {
      if (tier.maxUnits === undefined || units <= tier.maxUnits) {
        return tier;
      }
      matched = tier;
    }
  }
  return matched;
}

/** Compute total cost using graduated (stacked) tier pricing. */
export function computeGraduatedCost(
  tiers: TierList,
  units: number,
  currency: Currency = "USDC",
): PriceMoney {
  const sorted = [...tiers].sort((a, b) => a.minUnits - b.minUnits);
  let remaining = units;
  let totalBaseUnits = 0n;

  for (const tier of sorted) {
    if (remaining <= 0) break;
    const tierEnd = tier.maxUnits ?? Infinity;
    const tierStart = tier.minUnits;
    const tierCapacity =
      tierEnd === Infinity ? remaining : Math.min(tierEnd - tierStart + 1, remaining);
    const unitsInTier = Math.min(tierCapacity, remaining);

    const unitPrice = BigInt(tier.unitPriceBaseUnits);
    totalBaseUnits += BigInt(unitsInTier) * unitPrice;
    if (tier.flatFeeBaseUnits) {
      totalBaseUnits += BigInt(tier.flatFeeBaseUnits);
    }
    remaining -= unitsInTier;
  }

  return priceMoney(Usdc.fromBaseUnits(totalBaseUnits), currency);
}

/** Compute total cost using volume (flat-rate) tier pricing — single tier applies to all units. */
export function computeVolumeCost(
  tiers: TierList,
  units: number,
  currency: Currency = "USDC",
): PriceMoney {
  const tier = findTier(tiers, units);
  if (!tier) return priceMoney(Usdc.ZERO, currency);
  const unitPrice = BigInt(tier.unitPriceBaseUnits);
  const flatFee = tier.flatFeeBaseUnits ? BigInt(tier.flatFeeBaseUnits) : 0n;
  const total = BigInt(units) * unitPrice + flatFee;
  return priceMoney(Usdc.fromBaseUnits(total), currency);
}
