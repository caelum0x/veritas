// Pricing rule interface and built-in rule implementations.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import { type PriceMoney, priceMoney, type PricingContext } from "./types.js";
import { type Discount, applyDiscount, percentageDiscount } from "./discount.js";
import { addMoney, subtractMoney } from "./currency.js";

/** A rule transforms an in-flight price during rule-engine evaluation. */
export interface PriceRule {
  readonly id: string;
  readonly label: string;
  /** Priority — lower numbers run first. */
  readonly priority: number;
  /** Returns the modified price and any discount or surcharge applied. */
  apply(
    price: PriceMoney,
    context: PricingContext,
  ): { price: PriceMoney; discount?: Discount & { reduction: PriceMoney } };
}

export const PriceRuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priority: z.number().int(),
});

/** Yearly billing discount: reduces price by a percentage when interval is YEARLY. */
export class YearlyBillingDiscountRule implements PriceRule {
  readonly id = "yearly-billing-discount";
  readonly label: string;
  readonly priority: number;
  private readonly pct: number;

  constructor(pct: number, priority = 10) {
    this.pct = pct;
    this.priority = priority;
    this.label = `Yearly billing discount (${pct}%)`;
  }

  apply(
    price: PriceMoney,
    context: PricingContext,
  ): { price: PriceMoney; discount?: Discount & { reduction: PriceMoney } } {
    if (context.billingInterval !== "YEARLY") return { price };
    const discount = percentageDiscount(this.pct, this.label);
    const reduced = applyDiscount(price, discount);
    const reduction = subtractMoney(price, reduced);
    return { price: reduced, discount: { ...discount, reduction } };
  }
}

/** Volume discount: percentage off when quantity meets or exceeds a threshold. */
export class VolumeDiscountRule implements PriceRule {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  private readonly threshold: number;
  private readonly pct: number;

  constructor(threshold: number, pct: number, priority = 20) {
    this.threshold = threshold;
    this.pct = pct;
    this.priority = priority;
    this.id = `volume-discount-${threshold}`;
    this.label = `Volume discount ${pct}% (qty ≥ ${threshold})`;
  }

  apply(
    price: PriceMoney,
    context: PricingContext,
  ): { price: PriceMoney; discount?: Discount & { reduction: PriceMoney } } {
    if (context.quantity < this.threshold) return { price };
    const discount = percentageDiscount(this.pct, this.label);
    const reduced = applyDiscount(price, discount);
    const reduction = subtractMoney(price, reduced);
    return { price: reduced, discount: { ...discount, reduction } };
  }
}

/** Flat surcharge rule: adds a fixed USDC amount to the price. */
export class FlatSurchargeRule implements PriceRule {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  private readonly baseUnits: bigint;

  constructor(id: string, label: string, baseUnits: bigint, priority = 50) {
    this.id = id;
    this.label = label;
    this.baseUnits = baseUnits;
    this.priority = priority;
  }

  apply(
    price: PriceMoney,
    _context: PricingContext,
  ): { price: PriceMoney; discount?: Discount & { reduction: PriceMoney } } {
    const surcharge = priceMoney(Usdc.fromBaseUnits(this.baseUnits), price.currency);
    return { price: addMoney(price, surcharge) };
  }
}
