// Pricing models for agent capabilities — describes cost per invocation or unit.

import { z } from "zod";

/** Billing granularity. */
export const BillingUnitSchema = z.enum([
  "request",
  "token",
  "word",
  "character",
  "minute",
  "byte",
  "claim",
  "source",
]);
export type BillingUnit = z.infer<typeof BillingUnitSchema>;

/** ISO 4217 currency code, e.g. "USD". */
export const CurrencySchema = z.string().length(3).toUpperCase();
export type Currency = z.infer<typeof CurrencySchema>;

/** A single price tier: rate charged per `unit` up to optional `upTo` units. */
export const PriceTierSchema = z.object({
  /** Maximum units this tier covers; null means unlimited (last tier). */
  upTo: z.number().int().positive().nullable(),
  /** Price in smallest currency unit (e.g. cents for USD) per billing unit. */
  unitAmountMicros: z.number().int().nonnegative(),
  currency: CurrencySchema,
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

/** Flat rate — fixed cost per request regardless of volume. */
export const FlatPricingSchema = z.object({
  model: z.literal("flat"),
  unit: BillingUnitSchema,
  /** Price in micros (1/1_000_000 of the currency unit). */
  unitAmountMicros: z.number().int().nonnegative(),
  currency: CurrencySchema,
  description: z.string().optional(),
});
export type FlatPricing = z.infer<typeof FlatPricingSchema>;

/** Tiered pricing — rate changes based on volume consumed. */
export const TieredPricingSchema = z.object({
  model: z.literal("tiered"),
  unit: BillingUnitSchema,
  tiers: z.array(PriceTierSchema).min(1),
  description: z.string().optional(),
});
export type TieredPricing = z.infer<typeof TieredPricingSchema>;

/** Free — no charge but the field is still explicitly stated. */
export const FreePricingSchema = z.object({
  model: z.literal("free"),
  description: z.string().optional(),
});
export type FreePricing = z.infer<typeof FreePricingSchema>;

/** Custom / negotiated pricing — directs caller to a contact URL. */
export const CustomPricingSchema = z.object({
  model: z.literal("custom"),
  contactUrl: z.string().url(),
  description: z.string().optional(),
});
export type CustomPricing = z.infer<typeof CustomPricingSchema>;

export const PricingSchema = z.discriminatedUnion("model", [
  FlatPricingSchema,
  TieredPricingSchema,
  FreePricingSchema,
  CustomPricingSchema,
]);
export type Pricing = z.infer<typeof PricingSchema>;

/** Construct a simple flat pricing entry. */
export function flatPricing(
  unit: BillingUnit,
  unitAmountMicros: number,
  currency: Currency,
  description?: string,
): FlatPricing {
  return { model: "flat", unit, unitAmountMicros, currency, description };
}

/** Construct a free pricing entry. */
export function freePricing(description?: string): FreePricing {
  return { model: "free", description };
}

/** Construct a custom / negotiated pricing entry. */
export function customPricing(contactUrl: string, description?: string): CustomPricing {
  return { model: "custom", contactUrl, description };
}
