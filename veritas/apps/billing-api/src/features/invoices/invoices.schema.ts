// Zod schemas for invoice request/response validation.

import { z } from "zod";

export const GenerateInvoiceBodySchema = z.object({
  organizationId: z.string().regex(/^org_/, "Must be a valid org id"),
  planId: z.string().min(1),
  subscriptionId: z.string().regex(/^sub_/, "Must be a valid subscription id"),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  usages: z
    .array(
      z.object({
        metric: z.enum(["VERIFICATIONS", "CLAIMS", "TOKENS", "SOURCES"]),
        quantity: z.number().int().nonnegative(),
        organizationId: z.string().optional(),
      }),
    )
    .default([]),
});

export const FinalizeInvoiceParamsSchema = z.object({
  invoiceId: z.string().regex(/^inv_/, "Must be a valid invoice id"),
});

export const MarkPaidInvoiceParamsSchema = z.object({
  invoiceId: z.string().regex(/^inv_/, "Must be a valid invoice id"),
});

export const VoidInvoiceParamsSchema = z.object({
  invoiceId: z.string().regex(/^inv_/, "Must be a valid invoice id"),
});

export const GetInvoiceParamsSchema = z.object({
  invoiceId: z.string().regex(/^inv_/, "Must be a valid invoice id"),
});

export const ListInvoicesQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "PAID", "VOID", "UNCOLLECTIBLE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const ApplyTaxBodySchema = z.object({
  invoiceId: z.string().regex(/^inv_/, "Must be a valid invoice id"),
  sellerCountry: z.string().length(2),
  buyerCountry: z.string().length(2),
  isB2B: z.boolean().default(false),
  buyerVatNumber: z.string().optional(),
  category: z
    .enum(["standard", "reduced", "zero", "exempt", "digital_services", "financial_services"])
    .default("digital_services"),
});

export type GenerateInvoiceBody = z.infer<typeof GenerateInvoiceBodySchema>;
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;
export type ApplyTaxBody = z.infer<typeof ApplyTaxBodySchema>;
