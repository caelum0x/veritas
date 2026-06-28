// Zod schemas for tax API request/response validation.

import { z } from "zod";

export const TaxContextBodySchema = z.object({
  buyerCountry: z.string().length(2),
  buyerRegion: z.string().optional(),
  sellerCountry: z.string().length(2),
  sellerRegion: z.string().optional(),
  category: z.enum([
    "standard",
    "reduced",
    "zero",
    "exempt",
    "digital_services",
    "financial_services",
  ]),
  isB2B: z.boolean().default(false),
  buyerVatNumber: z.string().optional(),
  organizationId: z.string().optional(),
});

export const CalculateTaxBodySchema = z.object({
  amountBaseUnits: z.union([z.bigint(), z.string().transform((v) => BigInt(v))]),
  context: TaxContextBodySchema,
});

export const CreateRegistrationBodySchema = z.object({
  organizationId: z.string().min(1),
  jurisdictionCode: z.string().min(2).max(10),
  taxNumber: z.string().min(1),
  taxType: z.enum(["VAT", "GST", "SALES_TAX", "WITHHOLDING", "EXCISE"]),
  registeredAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  filingFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  notes: z.string().optional(),
});

export const ActivateRegistrationParamsSchema = z.object({
  registrationId: z.string().min(1),
});

export const CreateExemptionBodySchema = z.object({
  organizationId: z.string().min(1),
  type: z.enum(["NONPROFIT", "GOVERNMENT", "RESELLER", "EDUCATIONAL", "DIPLOMATIC", "CUSTOM"]),
  jurisdictionCode: z.string().min(2).max(10),
  certificateNumber: z.string().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const OrgJurisdictionQuerySchema = z.object({
  organizationId: z.string().min(1),
  jurisdictionCode: z.string().min(2).max(10).optional(),
});

export const CountryQuerySchema = z.object({
  country: z.string().length(2).optional(),
});
