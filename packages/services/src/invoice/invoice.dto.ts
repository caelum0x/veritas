// Input/output DTOs for invoice use-cases.
import { z } from "zod";
import {
  InvoiceSchema,
  CreateInvoiceSchema,
  InvoiceStatusSchema,
} from "@veritas/contracts";

/** Input DTO for creating a new invoice (draft). */
export const CreateInvoiceInputSchema = CreateInvoiceSchema;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

/** Input DTO for transitioning invoice status. */
export const UpdateInvoiceStatusInputSchema = z.object({
  status: InvoiceStatusSchema,
  paidAt: z.string().nullable().optional(),
});
export type UpdateInvoiceStatusInput = z.infer<typeof UpdateInvoiceStatusInputSchema>;

/** Input DTO for fetching a single invoice by ID. */
export const GetInvoiceInputSchema = z.object({
  invoiceId: z.string().min(1),
});
export type GetInvoiceInput = z.infer<typeof GetInvoiceInputSchema>;

/** Input DTO for fetching a single invoice by human-readable number. */
export const GetInvoiceByNumberInputSchema = z.object({
  number: z.string().min(1),
});
export type GetInvoiceByNumberInput = z.infer<typeof GetInvoiceByNumberInputSchema>;

/** Query parameters for listing invoices. */
export const ListInvoicesInputSchema = z.object({
  organizationId: z.string().optional(),
  subscriptionId: z.string().optional(),
  status: InvoiceStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListInvoicesInput = z.infer<typeof ListInvoicesInputSchema>;

/** Output DTO representing a single invoice. */
export const InvoiceOutputSchema = InvoiceSchema;
export type InvoiceOutput = z.infer<typeof InvoiceOutputSchema>;

/** Output DTO for paginated invoice lists. */
export const InvoiceListOutputSchema = z.object({
  items: z.array(InvoiceSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type InvoiceListOutput = z.infer<typeof InvoiceListOutputSchema>;
