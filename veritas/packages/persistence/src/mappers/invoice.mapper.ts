// Mapper between Invoice domain objects and raw persistence rows.

import type { Invoice, CreateInvoice, InvoiceLineItem } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch, systemClock } from "@veritas/core";

/** Persistence row shape for an Invoice. */
export type InvoiceRow = {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly number: string;
  readonly status: string;
  readonly lineItems: ReadonlyArray<InvoiceLineItem>;
  readonly subtotalAmount: string;
  readonly totalAmount: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueAt: string | null;
  readonly paidAt: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
};

/** Compute subtotal and total amount string from line items (sum of amounts). */
function computeTotals(lineItems: ReadonlyArray<InvoiceLineItem>): { subtotalAmount: string; totalAmount: string } {
  const cents = lineItems.reduce((acc, item) => acc + BigInt(item.amount.amount), BigInt(0));
  const formatted = String(cents);
  return { subtotalAmount: formatted, totalAmount: formatted };
}

/** Generate a sequential invoice number in format INV-YYYYMM-NNNN. */
function generateNumber(now: number, sequence: number): string {
  const d = new Date(now);
  const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${String(sequence).padStart(4, "0")}`;
}

let invoiceSequence = 0;

/** Map a CreateInvoice DTO to a new InvoiceRow with generated id and timestamps. */
export function toInvoiceRow(dto: CreateInvoice): InvoiceRow {
  const now = Date.now();
  invoiceSequence += 1;
  const number = generateNumber(now, invoiceSequence);
  const lineItems = dto.lineItems ?? [];
  const { subtotalAmount, totalAmount } = computeTotals(lineItems);
  return {
    id: newId("inv"),
    organizationId: dto.organizationId,
    subscriptionId: dto.subscriptionId ?? null,
    number,
    status: "DRAFT",
    lineItems: lineItems.map((li) => ({ ...li })),
    subtotalAmount,
    totalAmount,
    periodStart: dto.periodStart,
    periodEnd: dto.periodEnd,
    dueAt: dto.dueAt ?? null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a persisted InvoiceRow to an Invoice domain object. */
export function fromInvoiceRow(row: InvoiceRow): Invoice {
  return {
    id: row.id as Invoice["id"],
    organizationId: row.organizationId as Invoice["organizationId"],
    subscriptionId: (row.subscriptionId ?? null) as Invoice["subscriptionId"],
    number: row.number,
    status: row.status as Invoice["status"],
    lineItems: row.lineItems.map((li) => ({ ...li })),
    subtotal: { amount: row.subtotalAmount, currency: "USDC" },
    total: { amount: row.totalAmount, currency: "USDC" },
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    dueAt: row.dueAt ?? null,
    paidAt: row.paidAt ?? null,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Merge update fields into an existing InvoiceRow, refreshing updatedAt. */
export function mergeInvoiceRow(
  existing: InvoiceRow,
  patch: Partial<InvoiceRow>
): InvoiceRow {
  return {
    ...existing,
    ...patch,
    id: existing.id,
    organizationId: existing.organizationId,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
}

/** Map an Invoice domain object back to a persistence row. */
export function fromInvoiceDomain(invoice: Invoice): InvoiceRow {
  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    subscriptionId: invoice.subscriptionId ?? null,
    number: invoice.number,
    status: invoice.status,
    lineItems: invoice.lineItems.map((li) => ({ ...li })),
    subtotalAmount: invoice.subtotal.amount,
    totalAmount: invoice.total.amount,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueAt: invoice.dueAt ?? null,
    paidAt: invoice.paidAt ?? null,
    createdAt: isoToEpoch(invoice.createdAt) ?? 0,
    updatedAt: isoToEpoch(invoice.updatedAt) ?? 0,
  };
}

/** Get a current epoch timestamp from the system clock. */
export function nowEpoch(): number {
  return systemClock.now();
}
