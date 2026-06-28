// Invoice entity: a billed statement for a subscription period with line items.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const InvoiceStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "PAID",
  "VOID",
  "UNCOLLECTIBLE",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(0),
  unitPrice: moneySchema,
  amount: moneySchema,
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceSchema = z
  .object({
    id: idSchema("inv"),
    organizationId: idSchema("org"),
    subscriptionId: idSchema("sub").nullable(),
    number: z.string(),
    status: InvoiceStatusSchema,
    lineItems: z.array(InvoiceLineItemSchema),
    subtotal: moneySchema,
    total: moneySchema,
    periodStart: z.string(),
    periodEnd: z.string(),
    dueAt: z.string().nullable(),
    paidAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceSchema = z.object({
  organizationId: idSchema("org"),
  subscriptionId: idSchema("sub").nullable().optional(),
  lineItems: z.array(InvoiceLineItemSchema),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueAt: z.string().nullable().optional(),
});
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;
