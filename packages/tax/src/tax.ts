// Core tax domain types for Veritas tax calculation module.

import { z } from "zod";

export const TaxCategorySchema = z.enum([
  "standard",
  "reduced",
  "zero",
  "exempt",
  "digital_services",
  "financial_services",
]);

export type TaxCategory = z.infer<typeof TaxCategorySchema>;

export const TaxTypeSchema = z.enum(["vat", "gst", "sales_tax", "withholding", "none"]);
export type TaxType = z.infer<typeof TaxTypeSchema>;

export const TaxBreakdownLineSchema = z.object({
  taxType: TaxTypeSchema,
  jurisdiction: z.string().min(1),
  rate: z.number().min(0).max(1),
  baseAmountBaseUnits: z.bigint(),
  taxAmountBaseUnits: z.bigint(),
  description: z.string().optional(),
});

export type TaxBreakdownLine = z.infer<typeof TaxBreakdownLineSchema>;

export const TaxResultSchema = z.object({
  subtotalBaseUnits: z.bigint(),
  totalTaxBaseUnits: z.bigint(),
  totalWithTaxBaseUnits: z.bigint(),
  effectiveRate: z.number().min(0).max(1),
  lines: z.array(TaxBreakdownLineSchema),
  isExempt: z.boolean(),
  exemptionCode: z.string().optional(),
  currency: z.string().default("USDC"),
});

export type TaxResult = z.infer<typeof TaxResultSchema>;

export const TaxContextSchema = z.object({
  buyerCountry: z.string().length(2),
  buyerRegion: z.string().optional(),
  sellerCountry: z.string().length(2),
  sellerRegion: z.string().optional(),
  category: TaxCategorySchema,
  isB2B: z.boolean().default(false),
  buyerVatNumber: z.string().optional(),
  organizationId: z.string().optional(),
});

export type TaxContext = z.infer<typeof TaxContextSchema>;

export const TaxRegistrationSchema = z.object({
  country: z.string().length(2),
  taxNumber: z.string().min(1),
  taxType: TaxTypeSchema,
  registeredAt: z.string(),
  validUntil: z.string().optional(),
});

export type TaxRegistration = z.infer<typeof TaxRegistrationSchema>;
