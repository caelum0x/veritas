// Volume discount rules: quantity-based price reductions applied to a base price.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import { type PriceMoney, priceMoney } from "./types.js";
import { NegativePriceError } from "./errors.js";

export const VolumeBracketSchema = z.object({
  /** Minimum quantity (inclusive) to qualify for this bracket. */
  minQty: z.number().int().min(1),
  /** Maximum quantity (inclusive), or undefined for open-ended bracket. */
  maxQty: z.number().int().positive().optional(),
  /** Percentage discount: 0–100 as a decimal string. */
  discountPct: z.string(),
});

export type VolumeBracket = z.infer<typeof VolumeBracketSchema>;

export const VolumePricingSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  brackets: z.array(VolumeBracketSchema).min(1),
});

export type VolumePricing = z.infer<typeof VolumePricingSchema>;

/** Find the matching volume bracket for a given quantity. */
export function findBracket(pricing: VolumePricing, qty: number): VolumeBracket | undefined {
  const sorted = [...pricing.brackets].sort((a, b) => a.minQty - b.minQty);
  let matched: VolumeBracket | undefined;
  for (const bracket of sorted) {
    if (qty >= bracket.minQty) {
      if (bracket.maxQty === undefined || qty <= bracket.maxQty) {
        return bracket;
      }
      matched = bracket;
    }
  }
  return matched;
}

/**
 * Apply volume pricing to a unit price, returning the discounted total.
 * The discount percentage applies to the per-unit price; quantity is multiplied after.
 */
export function applyVolumePricing(
  unitPrice: PriceMoney,
  qty: number,
  pricing: VolumePricing,
): PriceMoney {
  const bracket = findBracket(pricing, qty);
  const pct = bracket ? Number(bracket.discountPct) : 0;

  if (pct < 0 || pct > 100) {
    throw new NegativePriceError(`${pct}%`);
  }

  // Compute discounted unit price: unitPrice * (1 - pct/100)
  const scaledPct = BigInt(Math.trunc((100 - pct) * 100));
  const discountedUnitBaseUnits =
    (unitPrice.amount.baseUnits * scaledPct) / 10000n;
  const totalBaseUnits = discountedUnitBaseUnits * BigInt(qty);

  return priceMoney(
    Usdc.fromBaseUnits(totalBaseUnits < 0n ? 0n : totalBaseUnits),
    unitPrice.currency,
  );
}

/** Compute the per-unit price after volume discount (without quantity multiplication). */
export function discountedUnitPrice(
  unitPrice: PriceMoney,
  qty: number,
  pricing: VolumePricing,
): PriceMoney {
  const bracket = findBracket(pricing, qty);
  const pct = bracket ? Number(bracket.discountPct) : 0;

  if (pct < 0 || pct > 100) {
    throw new NegativePriceError(`${pct}%`);
  }

  const scaledPct = BigInt(Math.trunc((100 - pct) * 100));
  const baseUnits = (unitPrice.amount.baseUnits * scaledPct) / 10000n;

  return priceMoney(
    Usdc.fromBaseUnits(baseUnits < 0n ? 0n : baseUnits),
    unitPrice.currency,
  );
}
