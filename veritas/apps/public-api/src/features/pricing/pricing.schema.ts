// Zod request/response schemas for pricing feature HTTP endpoints.
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { PricingContextSchema } from "@veritas/pricing-engine";

export const ComputePriceBodySchema = z.object({
  planId: z.string().min(1),
  metric: UsageMetricSchema,
  quantity: z.number().int().positive(),
});
export type ComputePriceBody = z.infer<typeof ComputePriceBodySchema>;

export const EstimateMonthlyBodySchema = z.object({
  planId: z.string().min(1),
  organizationId: z.string().min(1),
  projectedUsage: z.record(UsageMetricSchema, z.number().int().nonnegative()),
});
export type EstimateMonthlyBody = z.infer<typeof EstimateMonthlyBodySchema>;

export const GetPricingTableParamSchema = z.object({
  planId: z.string().min(1),
});
export type GetPricingTableParam = z.infer<typeof GetPricingTableParamSchema>;

export const QuoteBodySchema = PricingContextSchema;
export type QuoteBody = z.infer<typeof QuoteBodySchema>;

export const ListCatalogQuerySchema = z.object({
  planSlug: z.string().optional(),
});
export type ListCatalogQuery = z.infer<typeof ListCatalogQuerySchema>;
