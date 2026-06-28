// Zod validators for Invoice admin endpoints
import { z } from "zod";
import { paginationSchema, InvoiceStatusSchema } from "@veritas/contracts";

export const listInvoicesQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: InvoiceStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  ...paginationSchema.shape,
});

export const getInvoiceParamsSchema = z.object({
  id: z.string().min(1),
});

export const voidInvoiceParamsSchema = z.object({
  id: z.string().min(1),
});

export const voidInvoiceBodySchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type GetInvoiceParams = z.infer<typeof getInvoiceParamsSchema>;
export type VoidInvoiceParams = z.infer<typeof voidInvoiceParamsSchema>;
export type VoidInvoiceBody = z.infer<typeof voidInvoiceBodySchema>;
