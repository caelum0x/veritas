// Zod validators for invoice request bodies and query params.
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listInvoicesQuerySchema = z.object({
  ...paginationSchema.shape,
  status: z.enum(["draft", "open", "paid", "void", "uncollectible"]).optional(),
  organizationId: z.string().optional(),
  subscriptionId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const getInvoiceParamsSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
});

export const voidInvoiceParamsSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
});

export const payInvoiceParamsSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
});

export const payInvoiceBodySchema = z.object({
  transactionHash: z.string().min(1).optional(),
  paymentMethod: z.enum(["usdc", "card", "wire"]).default("usdc"),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type GetInvoiceParams = z.infer<typeof getInvoiceParamsSchema>;
export type VoidInvoiceParams = z.infer<typeof voidInvoiceParamsSchema>;
export type PayInvoiceParams = z.infer<typeof payInvoiceParamsSchema>;
export type PayInvoiceBody = z.infer<typeof payInvoiceBodySchema>;
