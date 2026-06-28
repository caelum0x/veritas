// Price quote: immutable snapshot of a pricing calculation result.

import { z } from "zod";
import { type PriceMoney } from "./types.js";
import { type Discount } from "./discount.js";
import { toMoneyDto } from "./currency.js";

export const QuoteLineItemSchema = z.object({
  label: z.string(),
  amount: z.object({ currency: z.string(), amount: z.string() }),
});
export type QuoteLineItem = z.infer<typeof QuoteLineItemSchema>;

export const QuoteSchema = z.object({
  planSlug: z.string(),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  quantity: z.number().int().positive(),
  subtotal: z.object({ currency: z.string(), amount: z.string() }),
  discounts: z.array(
    z.object({
      label: z.string().optional(),
      kind: z.enum(["PERCENTAGE", "FLAT"]),
      value: z.string(),
      reduction: z.object({ currency: z.string(), amount: z.string() }),
    }),
  ),
  total: z.object({ currency: z.string(), amount: z.string() }),
  lineItems: z.array(QuoteLineItemSchema),
  promoCode: z.string().optional(),
  generatedAt: z.string().datetime(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export interface QuoteDiscountLine {
  readonly label?: string | undefined;
  readonly kind: "PERCENTAGE" | "FLAT";
  readonly value: string;
  readonly reduction: PriceMoney;
}

export interface QuoteInput {
  readonly planSlug: string;
  readonly billingInterval: "MONTHLY" | "YEARLY";
  readonly quantity: number;
  readonly subtotal: PriceMoney;
  readonly discounts: readonly (Discount & { reduction: PriceMoney })[];
  readonly total: PriceMoney;
  readonly lineItems: ReadonlyArray<{ label: string; amount: PriceMoney }>;
  readonly promoCode?: string | undefined;
}

/** Build an immutable Quote snapshot from engine output. */
export function buildQuote(input: QuoteInput): Quote {
  return {
    planSlug: input.planSlug,
    billingInterval: input.billingInterval,
    quantity: input.quantity,
    subtotal: toMoneyDto(input.subtotal),
    discounts: input.discounts.map((d) => ({
      label: d.label,
      kind: d.kind,
      value: d.value,
      reduction: toMoneyDto(d.reduction),
    })),
    total: toMoneyDto(input.total),
    lineItems: input.lineItems.map((li) => ({
      label: li.label,
      amount: toMoneyDto(li.amount),
    })),
    promoCode: input.promoCode,
    generatedAt: new Date().toISOString(),
  };
}
