// Discount value object: percentage or flat-amount reductions.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import { type PriceMoney, priceMoney } from "./types.js";
import { assertSameCurrency } from "./currency.js";
import { NegativePriceError } from "./errors.js";

export const DiscountKindSchema = z.enum(["PERCENTAGE", "FLAT"]);
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

export const DiscountSchema = z.object({
  kind: DiscountKindSchema,
  /** Percentage: 0–100. Flat: USDC base units as string. */
  value: z.string(),
  label: z.string().optional(),
});
export type Discount = z.infer<typeof DiscountSchema>;

/** Create a percentage discount (0–100). */
export function percentageDiscount(pct: number, label?: string): Discount {
  if (pct < 0 || pct > 100) throw new NegativePriceError(`${pct}%`);
  return { kind: "PERCENTAGE", value: String(pct), label };
}

/** Create a flat-amount discount in USDC base units. */
export function flatDiscount(baseUnits: bigint, label?: string): Discount {
  if (baseUnits < 0n) throw new NegativePriceError(String(baseUnits));
  return { kind: "FLAT", value: baseUnits.toString(), label };
}

/**
 * Apply a discount to a price, returning the reduced PriceMoney.
 * Result is clamped to zero to prevent negative prices.
 */
export function applyDiscount(price: PriceMoney, discount: Discount): PriceMoney {
  let reduction: Usdc;
  if (discount.kind === "PERCENTAGE") {
    const pct = Number(discount.value);
    // Integer division: multiply base units by pct then divide by 100.
    const reduced = (price.amount.baseUnits * BigInt(Math.trunc(pct * 100))) / 10000n;
    reduction = Usdc.fromBaseUnits(reduced);
  } else {
    reduction = Usdc.fromBaseUnits(BigInt(discount.value));
  }

  const reduced = price.amount.subtract(reduction);
  const clamped = reduced.compare(Usdc.ZERO) < 0 ? Usdc.ZERO : reduced;
  return priceMoney(clamped, price.currency);
}

/** Combine multiple discounts sequentially (each applied to the running price). */
export function applyDiscounts(price: PriceMoney, discounts: readonly Discount[]): PriceMoney {
  return discounts.reduce((current, d) => applyDiscount(current, d), price);
}

/** Sum all discounts as a total reduction PriceMoney from an original price. */
export function totalDiscount(original: PriceMoney, discounted: PriceMoney): PriceMoney {
  assertSameCurrency(original, discounted);
  const diff = original.amount.subtract(discounted.amount);
  const clamped = diff.compare(Usdc.ZERO) < 0 ? Usdc.ZERO : diff;
  return priceMoney(clamped, original.currency);
}
