// Discount value types: percentage, fixed amount, or free trial extension.
import { z } from "zod";
import { type Usdc } from "@veritas/core";

export const DiscountKindSchema = z.enum(["percent", "fixed_usdc", "trial_days"]);
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

export const PercentDiscountSchema = z.object({
  kind: z.literal("percent"),
  basisPoints: z.number().int().min(1).max(10000),
});
export type PercentDiscount = z.infer<typeof PercentDiscountSchema>;

export const FixedUsdcDiscountSchema = z.object({
  kind: z.literal("fixed_usdc"),
  amountBaseUnits: z.bigint().positive(),
});
export type FixedUsdcDiscount = z.infer<typeof FixedUsdcDiscountSchema>;

export const TrialDaysDiscountSchema = z.object({
  kind: z.literal("trial_days"),
  days: z.number().int().min(1).max(365),
});
export type TrialDaysDiscount = z.infer<typeof TrialDaysDiscountSchema>;

export const DiscountSchema = z.discriminatedUnion("kind", [
  PercentDiscountSchema,
  FixedUsdcDiscountSchema,
  TrialDaysDiscountSchema,
]);
export type Discount = z.infer<typeof DiscountSchema>;

/** Apply a percent or fixed discount to a USDC base-unit price. Trial discounts return 0n. */
export function applyDiscount(priceBaseUnits: bigint, discount: Discount): bigint {
  switch (discount.kind) {
    case "percent": {
      const reduction = (priceBaseUnits * BigInt(discount.basisPoints)) / 10000n;
      return priceBaseUnits - reduction < 0n ? 0n : priceBaseUnits - reduction;
    }
    case "fixed_usdc": {
      const after = priceBaseUnits - discount.amountBaseUnits;
      return after < 0n ? 0n : after;
    }
    case "trial_days":
      return 0n;
  }
}

/** Human-readable label for a discount. */
export function discountLabel(discount: Discount): string {
  switch (discount.kind) {
    case "percent":
      return `${(discount.basisPoints / 100).toFixed(0)}% off`;
    case "fixed_usdc":
      return `$${(Number(discount.amountBaseUnits) / 1_000_000).toFixed(2)} off`;
    case "trial_days":
      return `${discount.days} free days`;
  }
}
