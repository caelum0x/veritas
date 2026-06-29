// Input/output DTOs for pricing use-cases.
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";

/** Supported pricing models for calculating a cost estimate. */
export const PricingModelSchema = z.enum(["per_unit", "tiered", "volume", "flat"]);
export type PricingModel = z.infer<typeof PricingModelSchema>;

/** Input DTO for computing the cost of a quantity of a given metric. */
export const ComputePriceInputSchema = z.object({
  planId: z.string().min(1),
  metric: UsageMetricSchema,
  quantity: z.number().int().positive(),
});
export type ComputePriceInput = z.infer<typeof ComputePriceInputSchema>;

/** Input DTO for estimating the monthly cost for an organization. */
export const EstimateMonthlyInputSchema = z.object({
  planId: z.string().min(1),
  organizationId: z.string().min(1),
  projectedUsage: z.record(UsageMetricSchema, z.number().int().nonnegative()),
});
export type EstimateMonthlyInput = z.infer<typeof EstimateMonthlyInputSchema>;

/** Input DTO for retrieving the price list for a plan. */
export const GetPricingTableInputSchema = z.object({
  planId: z.string().min(1),
});
export type GetPricingTableInput = z.infer<typeof GetPricingTableInputSchema>;

/** A single tier breakpoint within a tiered pricing scheme. */
export const PriceTierSchema = z.object({
  upTo: z.number().int().positive().nullable(),
  unitAmountCents: z.number().int().nonnegative(),
  flatAmountCents: z.number().int().nonnegative(),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

/** Output DTO describing pricing configuration for one metric on a plan. */
export const MetricPricingSchema = z.object({
  metric: UsageMetricSchema,
  model: PricingModelSchema,
  unitAmountCents: z.number().int().nonnegative(),
  tiers: z.array(PriceTierSchema).nullable(),
  includedQuantity: z.number().int().nonnegative(),
});
export type MetricPricing = z.infer<typeof MetricPricingSchema>;

/** Output DTO for a computed price breakdown. */
export const ComputedPriceOutputSchema = z.object({
  planId: z.string(),
  metric: UsageMetricSchema,
  quantity: z.number().int().nonnegative(),
  includedQuantity: z.number().int().nonnegative(),
  billableQuantity: z.number().int().nonnegative(),
  unitAmountCents: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().nonnegative(),
  model: PricingModelSchema,
});
export type ComputedPriceOutput = z.infer<typeof ComputedPriceOutputSchema>;

/** Output DTO for a monthly cost estimate broken down by metric. */
export const MonthlyEstimateOutputSchema = z.object({
  planId: z.string(),
  organizationId: z.string(),
  lineItems: z.array(ComputedPriceOutputSchema),
  totalAmountCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
});
export type MonthlyEstimateOutput = z.infer<typeof MonthlyEstimateOutputSchema>;

/** Output DTO for the full pricing table of a plan. */
export const PricingTableOutputSchema = z.object({
  planId: z.string(),
  planName: z.string(),
  baseAmountCents: z.number().int().nonnegative(),
  billingInterval: z.string(),
  metrics: z.array(MetricPricingSchema),
  currency: z.string().default("USD"),
});
export type PricingTableOutput = z.infer<typeof PricingTableOutputSchema>;
