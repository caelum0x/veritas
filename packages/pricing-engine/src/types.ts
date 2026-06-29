// Core domain types for the pricing engine.

import { z } from "zod";
import { Usdc } from "@veritas/core";

/** Supported currencies (extensible via fx.ts). */
export const SUPPORTED_CURRENCIES = ["USDC"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** A monetary value within the engine — always in USDC base units. */
export interface PriceMoney {
  readonly currency: Currency;
  readonly amount: Usdc;
}

export function priceMoney(amount: Usdc, currency: Currency = "USDC"): PriceMoney {
  return { currency, amount };
}

export function zeroPriceMoney(currency: Currency = "USDC"): PriceMoney {
  return { currency, amount: Usdc.ZERO };
}

/** Context fed into every rule and calculator invocation. */
export interface PricingContext {
  readonly planSlug: string;
  readonly billingInterval: "MONTHLY" | "YEARLY";
  readonly quantity: number;
  readonly promoCode?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export const PricingContextSchema = z.object({
  planSlug: z.string().min(1),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  quantity: z.number().int().min(1),
  promoCode: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** A fully resolved price quote returned to callers. */
export interface PriceQuote {
  readonly planSlug: string;
  readonly billingInterval: "MONTHLY" | "YEARLY";
  readonly quantity: number;
  /** Unit price before discounts. */
  readonly unitPrice: PriceMoney;
  /** Subtotal = unitPrice * quantity. */
  readonly subtotal: PriceMoney;
  /** Total discounts applied. */
  readonly totalDiscount: PriceMoney;
  /** Surcharges added after discounts. */
  readonly totalSurcharge: PriceMoney;
  /** Final amount due = subtotal - totalDiscount + totalSurcharge. */
  readonly total: PriceMoney;
  /** Human-readable breakdown lines for display. */
  readonly lineItems: readonly QuoteLineItem[];
}

export interface QuoteLineItem {
  readonly label: string;
  readonly amount: PriceMoney;
  /** Positive for charges, negative for discounts. */
  readonly kind: "BASE" | "DISCOUNT" | "SURCHARGE" | "TAX";
}
