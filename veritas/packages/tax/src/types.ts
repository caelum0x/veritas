// Shared tax domain types and Zod schemas for @veritas/tax.

import { z } from "zod";

export const TaxCategorySchema = z.enum([
  "SOFTWARE",
  "DIGITAL_SERVICE",
  "PROFESSIONAL_SERVICE",
  "PHYSICAL_GOOD",
  "SUBSCRIPTION",
  "DATA_SERVICE",
]);
export type TaxCategory = z.infer<typeof TaxCategorySchema>;

export const TaxRegistrationStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
]);
export type TaxRegistrationStatus = z.infer<typeof TaxRegistrationStatusSchema>;

export const ExemptionTypeSchema = z.enum([
  "NONPROFIT",
  "GOVERNMENT",
  "RESELLER",
  "EDUCATIONAL",
  "DIPLOMATIC",
  "CUSTOM",
]);
export type ExemptionType = z.infer<typeof ExemptionTypeSchema>;

export const TaxLineSchema = z.object({
  jurisdictionCode: z.string().min(2).max(10),
  jurisdictionName: z.string().min(1),
  taxType: z.enum(["VAT", "GST", "SALES_TAX", "WITHHOLDING", "EXCISE"]),
  rate: z.number().min(0).max(1),
  taxableAmount: z.bigint(),
  taxAmount: z.bigint(),
  isExempt: z.boolean(),
  exemptionReference: z.string().optional(),
});
export type TaxLine = z.infer<typeof TaxLineSchema>;

export const TaxBreakdownSchema = z.object({
  subtotal: z.bigint(),
  totalTax: z.bigint(),
  total: z.bigint(),
  lines: z.array(TaxLineSchema),
  effectiveRate: z.number().min(0).max(1),
  currency: z.string().length(3),
});
export type TaxBreakdown = z.infer<typeof TaxBreakdownSchema>;

export const TaxAddressSchema = z.object({
  countryCode: z.string().length(2),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});
export type TaxAddress = z.infer<typeof TaxAddressSchema>;

export const TaxContextSchema = z.object({
  sellerAddress: TaxAddressSchema,
  buyerAddress: TaxAddressSchema,
  category: TaxCategorySchema,
  amount: z.bigint(),
  currency: z.string().length(3),
  isB2B: z.boolean().default(false),
  vatNumber: z.string().optional(),
  exemptionId: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
});
export type TaxContext = z.infer<typeof TaxContextSchema>;
