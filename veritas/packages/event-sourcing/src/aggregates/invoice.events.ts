// Invoice domain events for the event-sourcing package.
import type { InvoiceStatus } from "@veritas/contracts";

export const INVOICE_CREATED = "invoice.created" as const;
export const INVOICE_FINALIZED = "invoice.finalized" as const;
export const INVOICE_PAID = "invoice.paid" as const;
export const INVOICE_VOIDED = "invoice.voided" as const;
export const INVOICE_OVERDUE = "invoice.overdue" as const;
export const INVOICE_LINE_ITEM_ADDED = "invoice.line_item_added" as const;

export type InvoiceEventType =
  | typeof INVOICE_CREATED
  | typeof INVOICE_FINALIZED
  | typeof INVOICE_PAID
  | typeof INVOICE_VOIDED
  | typeof INVOICE_OVERDUE
  | typeof INVOICE_LINE_ITEM_ADDED;

export interface InvoiceLineItemPayload {
  readonly id: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountUsdc: string;
  readonly totalAmountUsdc: string;
}

export interface InvoiceCreatedPayload {
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly subscriptionId?: string;
  readonly billingPeriodStart: string;
  readonly billingPeriodEnd: string;
  readonly currency: string;
  readonly dueAt: string;
}

export interface InvoiceFinalizedPayload {
  readonly totalAmountUsdc: string;
  readonly finalizedAt: string;
}

export interface InvoicePaidPayload {
  readonly amountPaidUsdc: string;
  readonly paidAt: string;
  readonly transactionId?: string;
}

export interface InvoiceVoidedPayload {
  readonly reason: string;
  readonly voidedAt: string;
}

export interface InvoiceOverduePayload {
  readonly overdueAt: string;
}

export interface InvoiceLineItemAddedPayload {
  readonly lineItem: InvoiceLineItemPayload;
}

export type InvoiceEventPayload =
  | InvoiceCreatedPayload
  | InvoiceFinalizedPayload
  | InvoicePaidPayload
  | InvoiceVoidedPayload
  | InvoiceOverduePayload
  | InvoiceLineItemAddedPayload;

export interface InvoiceState {
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly subscriptionId: string | undefined;
  readonly status: InvoiceStatus;
  readonly lineItems: ReadonlyArray<InvoiceLineItemPayload>;
  readonly totalAmountUsdc: string;
  readonly billingPeriodStart: string;
  readonly billingPeriodEnd: string;
  readonly currency: string;
  readonly dueAt: string;
  readonly paidAt: string | undefined;
  readonly voidedAt: string | undefined;
}

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  PAID: "PAID",
  VOID: "VOID",
  UNCOLLECTIBLE: "UNCOLLECTIBLE",
} as const satisfies Record<string, InvoiceStatus>;
